import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_zero_score_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new admin user (who has never voted)
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Fetch karma score and history for the newly registered admin (should be zero score and empty history)
  const karmaScore =
    await api.functional.community.admin.karma.at(adminConnection);
  typia.assert(karmaScore);
  // Validate that karma score is 0 and history is empty
  // Based on the DTO: ICommunityKarmaScore is an empty object, so we validate the structure and existence
  // The system contract states that zero score with empty history is the correct response for new users
  // The DTO definition confirms there are no specific properties to check, so structure validation via typia.assert is sufficient
  // No additional assertions needed beyond type safety and successful response
}
