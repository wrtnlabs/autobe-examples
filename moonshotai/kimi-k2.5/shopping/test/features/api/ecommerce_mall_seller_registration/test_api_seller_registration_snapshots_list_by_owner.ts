import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_snapshots_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Submit seller registration to create parent record and initial snapshot
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  // 3. Extract registration ID from response
  const registrationId = (registration as IEntity).id;
  // 4. Query registration snapshots with pagination
  const snapshots =
    await api.functional.ecommerceMall.seller.seller_registrations.snapshots.index(
      sellerConnection,
      {
        registrationId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshots.pagination.pages >= 0,
  );
  // 6. Validate snapshot data structure - typia.assert already validated types
  for (const snapshot of snapshots.data) {
    // Reviewer info validation - null when no admin review yet
    if (snapshot.reviewer !== null) {
      TestValidator.equals(
        "reviewer has email",
        typeof snapshot.reviewer.email,
        "string",
      );
      TestValidator.equals(
        "reviewer has grade",
        typeof snapshot.reviewer.grade,
        "string",
      );
    }
  }
  // 7. Validate descending sort order (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].createdAt).getTime();
      const next = new Date(snapshots.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `snapshot[${i}] createdAt >= snapshot[${i + 1}] createdAt`,
        current >= next,
      );
    }
  }
}
