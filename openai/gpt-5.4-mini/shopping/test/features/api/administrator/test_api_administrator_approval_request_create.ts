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

export async function test_api_administrator_approval_request_create(
  connection: api.IConnection,
): Promise<void> {
  const applicantConnection: api.IConnection = { host: connection.host };
  const applicant = await authorize_administrator_join(applicantConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(applicant);
  const reason: string = RandomGenerator.paragraph({ sentences: 3 });
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.create(
      applicantConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(output);
  TestValidator.equals("reason should be preserved", output.reason, reason);
  TestValidator.equals(
    "request should belong to applicant",
    output.administrator.id,
    applicant.id,
  );
  TestValidator.equals("request should be pending", output.status, "pending");
  TestValidator.equals(
    "reviewer administrator should be null",
    output.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "rejection reason should be null",
    output.rejectionReason,
    null,
  );
  TestValidator.equals("reviewed at should be null", output.reviewedAt, null);
}
