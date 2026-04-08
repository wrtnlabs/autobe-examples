import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_administrator_approval_request_duplicate_pending_block(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await generate_random_mall_platform_customer_administrator_approval_requests_create(
      customerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request starts pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request stores applicant reason",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request has no reviewer yet",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "first request has no rejection reason",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first request has no review timestamp",
    firstRequest.reviewedAt,
    null,
  );
  const duplicateReason = RandomGenerator.paragraph({ sentences: 4 });
  await TestValidator.error(
    "duplicate pending administrator approval request is blocked",
    async () => {
      await generate_random_mall_platform_customer_administrator_approval_requests_create(
        customerConnection,
        {
          body: {
            reason: duplicateReason,
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original request remains pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason remains unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "original request remains unresolved",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "original request rejection reason remains empty",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "original request review timestamp remains empty",
    firstRequest.reviewedAt,
    null,
  );
}
