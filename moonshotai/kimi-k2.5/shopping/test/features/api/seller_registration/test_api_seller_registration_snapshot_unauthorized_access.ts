import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller authenticates and creates registration
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  const registration1 =
    await generate_random_ecommerce_mall_seller_registrations_create(
      seller1Connection,
      {},
    );
  const registration1Id = (registration1 as any).id as string &
    tags.Format<"uuid">;
  // 2. Admin authenticates and reviews first seller's registration (creates snapshot)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: registration1Id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // 3. Second seller authenticates
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  // 4. Second seller attempts to access first seller's snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access to another seller's registration snapshot",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.seller.seller_registrations.snapshots.at(
        seller2Connection,
        {
          registrationId: registration1Id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
