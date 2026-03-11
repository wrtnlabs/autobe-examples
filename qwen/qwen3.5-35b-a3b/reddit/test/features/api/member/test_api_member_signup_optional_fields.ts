import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_signup_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);
  const password = RandomGenerator.alphaNumeric(12);
  // Generate optional profile fields with exact values to verify storage
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  // Generate required session fields
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create member account with all optional fields
  const joinConnection: api.IConnection = { host: connection.host };
  const response = await authorize_member_join(joinConnection, {
    body: {
      email,
      username,
      password,
      displayName,
      bio,
      avatarUrl,
      href,
      referrer,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(response);
  // Validate that all optional fields are stored with exact values
  // bio and avatar_url are at top level of IAuthorized, not in user summary
  TestValidator.equals(
    "display name matches input",
    response.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", response.bio, bio);
  TestValidator.equals(
    "avatar url matches input",
    response.avatar_url,
    avatarUrl,
  );
}
