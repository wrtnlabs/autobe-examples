import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_view_without_moderator_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member B (non-moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBResult);
  // 2. Generate valid UUIDs for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test that non-moderator gets 403 when trying to view report
  await TestValidator.httpError(
    "non-moderator cannot view report - should return 403 Forbidden",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.reports.at(
        memberBConnection,
        {
          postId,
          reportId,
        },
      );
    },
  );
  // 4. Test with another non-moderator connection for consistency
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCResult = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberCResult);
  await TestValidator.httpError(
    "second non-moderator also cannot view report - should return 403 Forbidden",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.reports.at(
        memberCConnection,
        {
          postId,
          reportId,
        },
      );
    },
  );
}