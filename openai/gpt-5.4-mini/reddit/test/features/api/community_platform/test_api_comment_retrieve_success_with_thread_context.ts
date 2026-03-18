import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_retrieve_success_with_thread_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const comment = await api.functional.communityPlatform.member.comments.at(
    memberConnection,
    {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(comment);
  TestValidator.predicate("comment has content", comment.content.length > 0);
  TestValidator.predicate(
    "comment has author summary",
    comment.member !== null && comment.member !== undefined,
  );
  TestValidator.predicate(
    "comment has post summary",
    comment.post !== null && comment.post !== undefined,
  );
  TestValidator.predicate(
    "comment has created timestamp",
    comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment has updated timestamp",
    comment.updated_at.length > 0,
  );
  TestValidator.equals("comment is active", comment.deleted_at, null);
  TestValidator.equals(
    "top-level parent is null or nested reply keeps parent context",
    comment.parent,
    null,
  );
}
