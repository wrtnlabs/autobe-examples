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

export async function test_api_report_view_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create member connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 3. Call report view endpoint with random UUIDs
  // (In simulation mode, typia.random generates valid mock data for response)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const report = await api.functional.redditCommunity.member.posts.reports.at(
    authenticatedConnection,
    {
      postId,
      reportId,
    },
  );
  typia.assert(report);
  // 4. Validate response structure
  TestValidator.equals("report id matches", report.id, reportId);
  TestValidator.predicate(
    "reason is non-empty",
    () => report.reason.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty",
    () => report.status.length > 0,
  );
  TestValidator.equals(
    "post details present",
    report.post.id !== undefined,
    true,
  );
  TestValidator.equals(
    "reporter details present",
    report.reporter.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community details present",
    report.community.id !== undefined,
    true,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(report.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(report.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is nullable or date-time",
    () => report.deleted_at === null || !isNaN(Date.parse(report.deleted_at)),
  );
}
