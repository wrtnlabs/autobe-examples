import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_promotion_request_not_found_error(
  connection: api.IConnection,
) {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 2. Generate non-existent promotion request ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify not found error when attempting to review non-existent request
  await TestValidator.error(
    "should throw not found for non-existent promotion request",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.promotion_requests.review(
        superAdminConnection,
        {
          promotionRequestId: nonExistentId,
          body: {
            decision: "approve",
            rejectionReason: null,
          } satisfies IEcommerceMallAdminPromotionRequest.IReview,
        },
      );
    },
  );
}
