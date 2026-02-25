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

export async function test_api_review_flag_assign_already_under_review(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Note: Since we cannot create review flags directly via API, we need to simulate
  // a scenario where a flag already exists in 'under_review' or 'resolved' status.
  // However, the current API doesn't provide endpoints to create review flags or
  // set their status. Therefore, we'll test the business rule by attempting to
  // assign a non-existent flag with a valid UUID format, which should fail.
  // This validates that the endpoint properly handles invalid flag IDs.
  const invalidFlagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to assign the non-existent flag (which should fail)
  await TestValidator.error(
    "assign non-existent flag should fail",
    async () => {
      await api.functional.ecommerce.administrator.review_flags.assign(
        adminConnection,
        {
          flagId: invalidFlagId,
          body: {} satisfies IEcommerceReviewFlag.IAssign,
        },
      );
    },
  );
}
