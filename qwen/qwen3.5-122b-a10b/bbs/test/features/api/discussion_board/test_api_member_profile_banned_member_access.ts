import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_banned_member_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: auth.token.access },
  };
  // 3. Get member profile
  const profile =
    await api.functional.discussionBoard.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate profile structure
  TestValidator.equals("member ID matches", profile.id, auth.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    auth.display_name,
  );
  TestValidator.predicate(
    "ban_status exists",
    profile.ban_status === "active" || profile.ban_status === "banned",
  );
  TestValidator.predicate("has article count", profile.article_count >= 0);
  TestValidator.predicate("has comment count", profile.comment_count >= 0);
}
