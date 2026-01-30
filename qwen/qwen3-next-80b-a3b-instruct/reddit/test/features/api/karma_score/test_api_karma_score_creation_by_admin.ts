import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import { prepare_random_community_bbs_karma_score } from "../../../prepare/prepare_random_community_bbs_karma_score";
import { generate_random_community_bbs_admin_karma_scores_create } from "../../../generate/generate_random_community_bbs_admin_karma_scores_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_score_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate random admin credentials and join as admin
  const adminCredentials: ICommunityBbsAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(admin);
  // Step 3: Generate a random member ID (UUID)
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create a karma score record with valid positive value (+25)
  const karmaScoreData: ICommunityBbsKarmaScore.ICreate = {
    member_id: memberId,
    karma_points: 25, // Within valid range of -10 to +50
  } satisfies ICommunityBbsKarmaScore.ICreate;
  // Step 5: Create the karma score record using the already authenticated admin connection with utility function
  const createdKarmaScore: ICommunityBbsKarmaScore =
    await generate_random_community_bbs_admin_karma_scores_create(
      adminConnection,
      {
        body: karmaScoreData,
      },
    );
  // Step 6: Validate that the created karma score has correct properties according to ICommunityBbsKarmaScore interface
  // Note: The response type ICommunityBbsKarmaScore does NOT include member_id or karma_points
  // These are request properties only. The response contains the updated karma summary.
  TestValidator.predicate(
    "created karma score has positive currentScore",
    createdKarmaScore.currentScore >= 0,
  );
  TestValidator.predicate(
    "created karma score has null or number pendingPenalties",
    createdKarmaScore.pendingPenalties === null ||
      typeof createdKarmaScore.pendingPenalties === "number",
  );
  TestValidator.predicate(
    "created karma score has valid decayStatus",
    ["active", "declining", "stagnant"].includes(createdKarmaScore.decayStatus),
  );
  TestValidator.predicate(
    "created karma score has valid lastUpdated timestamp",
    new Date(createdKarmaScore.lastUpdated).toISOString() ===
      createdKarmaScore.lastUpdated,
  );
  // Step 7: Final type validation
  typia.assert<ICommunityBbsKarmaScore>(createdKarmaScore);
}
