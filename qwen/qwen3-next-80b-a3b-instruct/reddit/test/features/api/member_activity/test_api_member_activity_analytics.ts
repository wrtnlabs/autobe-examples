import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_activity_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using authorization utility function
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Use the authenticated member connection to call the analytics endpoint
  const activityData: ICommunityPlatformUserActivity =
    await api.functional.communityPlatform.member.analytics.users.activity.index(
      memberConnection,
    );
  // Validate the response structure and types with typia.assert()
  // This performs COMPLETE validation of all schemas, formats, constraints, and types
  // according to the absolute prohibition against type error testing
  typia.assert(activityData);
}
