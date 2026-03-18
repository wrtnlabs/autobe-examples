import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variant_snapshots_filters_match_and_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: authorized.token.access };
  const firstPage =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "has at least one visible snapshot for this member",
    () => firstPage.data.length > 0,
  );
  const anchor = firstPage.data[0];
  const productVariantId = anchor.productVariant.id;
  const code = anchor.code;
  const name = anchor.name;
  const codeFiltered =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: {
          productVariantId,
          code,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(codeFiltered);
  TestValidator.predicate("all results match productVariantId", () =>
    codeFiltered.data.every((r) => r.productVariant.id === productVariantId),
  );
  TestValidator.predicate("all results match code", () =>
    codeFiltered.data.every((r) => r.code === code),
  );
  const nameNeedle = name.length > 3 ? name.slice(0, 3) : name;
  const nameFiltered =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: {
          productVariantId,
          name: nameNeedle,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(nameFiltered);
  TestValidator.predicate("all results match name substring", () =>
    nameFiltered.data.every((r) => r.name.includes(nameNeedle)),
  );
  const createdAtExact = anchor.created_at;
  const windowFiltered =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: {
          productVariantId,
          createdAtFrom: createdAtExact,
          createdAtTo: createdAtExact,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(windowFiltered);
  TestValidator.predicate(
    "window returns records with created_at exactly equal to anchor",
    () => windowFiltered.data.every((r) => r.created_at === createdAtExact),
  );
  TestValidator.predicate("window includes anchor snapshot", () =>
    windowFiltered.data.some((r) => r.id === anchor.id),
  );
  const noMatchCode = `${code}-no-such-code-${typia.random<string>()}`;
  const noMatch =
    await api.functional.shoppingMall.member.productVariantSnapshots.index(
      authConnection,
      {
        body: {
          productVariantId,
          code: noMatchCode,
          createdAtFrom: createdAtExact,
          createdAtTo: createdAtExact,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(noMatch);
  TestValidator.equals("noMatch data empty", noMatch.data.length, 0);
  TestValidator.equals(
    "noMatch pagination records",
    noMatch.pagination.records,
    0,
  );
  TestValidator.equals("noMatch pagination pages", noMatch.pagination.pages, 0);
  TestValidator.equals(
    "noMatch pagination current",
    noMatch.pagination.current,
    1,
  );
  TestValidator.equals(
    "noMatch pagination limit",
    noMatch.pagination.limit,
    20,
  );
}
