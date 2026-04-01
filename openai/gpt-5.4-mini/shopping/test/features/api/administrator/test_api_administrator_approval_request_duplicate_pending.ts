import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_administrator_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_administrator_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_duplicate_pending(
  connection: api.IConnection,
): Promise<void> {
  const applicantConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(applicantConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstReason: string = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.create(
      applicantConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request reason preserved",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reviewer is null",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "first request rejection reason is null",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first request reviewedAt is null",
    firstRequest.reviewedAt,
    null,
  );
  const secondReason: string = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "duplicate pending administrator approval request should be rejected",
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.create(
        applicantConnection,
        {
          body: {
            reason: secondReason,
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original request remains unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "original request remains pending",
    firstRequest.status,
    "pending",
  );
}
