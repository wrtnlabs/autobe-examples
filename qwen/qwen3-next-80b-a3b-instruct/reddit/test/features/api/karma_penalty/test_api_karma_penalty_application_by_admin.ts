import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaPenalty";
import { prepare_random_community_bbs_karma_penalty } from "../../../prepare/prepare_random_community_bbs_karma_penalty";
import { generate_random_community_bbs_admin_karma_penalties_create } from "../../../generate/generate_random_community_bbs_admin_karma_penalties_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_penalty_application_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Create a real user who will receive the penalty
  const userConnection: api.IConnection = { host: connection.host };
  const user: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(user);
  // Define penalty details
  const penaltyType: string = "spam";
  const reason: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  // Apply karma penalty using the utility function
  const penalty: ICommunityBbsKarmaPenalty =
    await generate_random_community_bbs_admin_karma_penalties_create(
      adminConnection,
      {
        body: {
          user_id: user.id,
          moderator_id: admin.id,
          penalty_type: penaltyType,
          reason,
        },
      },
    );
  typia.assert(penalty);
  // Validate penalty record
  TestValidator.equals(
    "penalty type matches",
    penalty.penalty_type,
    penaltyType,
  );
  TestValidator.equals("reason matches", penalty.reason, reason);
  TestValidator.equals("moderator_id matches", penalty.moderator_id, admin.id);
  TestValidator.equals("user_id matches", penalty.user_id, user.id);
  TestValidator.predicate("applied_at is a valid date-time", () => {
    const date = new Date(penalty.applied_at);
    return !isNaN(date.getTime()) && penalty.applied_at.length >= 19; // ISO format has at least "YYYY-MM-DDTHH:mm:ss"
  });
}
