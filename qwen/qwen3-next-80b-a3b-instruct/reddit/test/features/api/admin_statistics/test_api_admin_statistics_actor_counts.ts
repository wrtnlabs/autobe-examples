import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserKarma";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_statistics_actor_counts(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Call the statistics endpoint
  const stats =
    await api.functional.communityBbs.admin.statistics.actors.index(
      adminConnection,
    );
  typia.assert(stats);
  // Validate all required properties exist and are non-negative integers
  const statsCast = typia.assert<{ admin: number; member: number; moderator: number; guest: number }>(stats);
  TestValidator.equals("admin count is non-negative", statsCast.admin >= 0, true);
  TestValidator.equals("member count is non-negative", statsCast.member >= 0, true);
  TestValidator.equals(
    "moderator count is non-negative",
    statsCast.moderator >= 0,
    true,
  );
  TestValidator.equals("guest count is non-negative", statsCast.guest >= 0, true);
  // Validate total users logic: guest = total - (member + moderator + admin)
  // Note: We cannot directly validate this calculation since we don't have total users count
  // but we can verify all values are non-negative as required by spec
}