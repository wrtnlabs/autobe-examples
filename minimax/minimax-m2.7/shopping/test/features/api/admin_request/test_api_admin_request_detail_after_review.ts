import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_detail_after_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for reviewing requests
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller account that will submit the admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits an admin request
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 4. Retrieve the request details after submission
  const requestDetail =
    await api.functional.ecommerceMall.admin.admin.requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(requestDetail);
  // 5. Validate initial state (pending, no reviewer)
  TestValidator.equals("status is pending", requestDetail.status, "pending");
  TestValidator.equals(
    "reviewer is null initially",
    requestDetail.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewedReason is null initially",
    requestDetail.reviewedReason,
    null,
  );
  // 6. Verify request structure
  TestValidator.equals(
    "actorType is seller",
    requestDetail.actorType,
    "seller",
  );
  TestValidator.equals(
    "requestedGrade is admin",
    requestDetail.requestedGrade,
    "admin",
  );
  TestValidator.predicate("has valid id", requestDetail.id !== undefined);
  TestValidator.predicate(
    "has createdAt timestamp",
    requestDetail.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updatedAt timestamp",
    requestDetail.updatedAt !== undefined,
  );
}
