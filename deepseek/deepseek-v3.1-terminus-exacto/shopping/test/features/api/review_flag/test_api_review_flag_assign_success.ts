import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful assignment of a pending review flag by an authenticated administrator.
 */
export async function test_api_review_flag_assign_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a valid flag ID for testing (no flag creation endpoint available)
  const flagId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Assign the review flag to the administrator
  const assignedFlag =
    await api.functional.ecommerce.administrator.review_flags.assign(
      adminConnection,
      {
        flagId,
        body: {} satisfies IEcommerceReviewFlag.IAssign,
      },
    );
  typia.assert(assignedFlag);
  // Step 4: Validate the assignment results
  TestValidator.equals("flag IDs should match", assignedFlag.id, flagId);
  TestValidator.equals(
    "status should be 'under_review'",
    assignedFlag.status,
    "under_review",
  );
  TestValidator.predicate(
    "assigned_at timestamp should be set",
    assignedFlag.assigned_at !== null,
  );
  TestValidator.equals(
    "administrator ID should match",
    assignedFlag.administrator?.id,
    admin.id,
  );
  TestValidator.equals(
    "administrator email should match",
    assignedFlag.administrator?.email,
    admin.email,
  );
}
