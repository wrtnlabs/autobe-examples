import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistEntry";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlist_entries_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_entries_create";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entries_search_with_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAAuth);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerBAuth);
  const customerAEntries: IShoppingMallWishlistEntry[] =
    await ArrayUtil.asyncRepeat(4, async () => {
      const entry =
        await generate_random_shopping_mall_customer_wishlist_entries_create(
          customerAConnection,
          {},
        );
      typia.assert(entry);
      return entry;
    });
  const customerBEntries: IShoppingMallWishlistEntry[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const entry =
        await generate_random_shopping_mall_customer_wishlist_entries_create(
          customerBConnection,
          {},
        );
      typia.assert(entry);
      return entry;
    });
  const targetEntry: IShoppingMallWishlistEntry = customerAEntries[0]!;
  const nonMatchingCandidate: IShoppingMallWishlistEntry =
    customerAEntries.find((entry) => entry.id !== targetEntry.id) ??
    customerAEntries[1]!;
  const candidateTerms: string[] = [
    targetEntry.product.name,
    ...targetEntry.product.name
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2),
    ...targetEntry.product.description
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2),
  ].filter(
    (value, index, array) => value.length > 0 && array.indexOf(value) === index,
  );
  const selectedSearch: string =
    candidateTerms.find((term) => {
      const lowerTerm = term.toLowerCase();
      const targetMatches =
        targetEntry.product.name.toLowerCase().includes(lowerTerm) ||
        targetEntry.product.description.toLowerCase().includes(lowerTerm);
      const nonMatchingMisses =
        !nonMatchingCandidate.product.name.toLowerCase().includes(lowerTerm) &&
        !nonMatchingCandidate.product.description
          .toLowerCase()
          .includes(lowerTerm);
      const customerBMisses = customerBEntries.every(
        (entry) =>
          !entry.product.name.toLowerCase().includes(lowerTerm) &&
          !entry.product.description.toLowerCase().includes(lowerTerm),
      );
      return targetMatches && nonMatchingMisses && customerBMisses;
    }) ?? targetEntry.product.name;
  const discriminatingAgainstKnownOtherA =
    !nonMatchingCandidate.product.name
      .toLowerCase()
      .includes(selectedSearch.toLowerCase()) &&
    !nonMatchingCandidate.product.description
      .toLowerCase()
      .includes(selectedSearch.toLowerCase());
  const searched =
    await api.functional.shoppingMall.customer.wishlistEntries.index(
      customerAConnection,
      {
        body: {
          search: selectedSearch,
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IShoppingMallWishlistEntry.IRequest,
      },
    );
  typia.assert(searched);
  TestValidator.predicate(
    "search returns at least one wishlist entry",
    searched.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page is first page",
    searched.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    searched.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "returned entries are all owned by customer A wishlist creations",
    searched.data.every((entry) =>
      customerAEntries.some((created) => created.id === entry.id),
    ),
  );
  TestValidator.predicate(
    "target matching entry is included",
    searched.data.some((entry) => entry.id === targetEntry.id),
  );
  TestValidator.predicate(
    "no customer B wishlist entry is exposed",
    searched.data.every((entry) =>
      customerBEntries.every((other) => other.id !== entry.id),
    ),
  );
  TestValidator.predicate(
    "returned summaries stay product oriented with embedded product data",
    searched.data.every((entry) =>
      customerAEntries.some(
        (created) =>
          created.id === entry.id && created.product.id === entry.product.id,
      ),
    ),
  );
  if (discriminatingAgainstKnownOtherA) {
    TestValidator.predicate(
      "known non matching customer A entry is excluded by search filter",
      searched.data.every((entry) => entry.id !== nonMatchingCandidate.id),
    );
  }
}
