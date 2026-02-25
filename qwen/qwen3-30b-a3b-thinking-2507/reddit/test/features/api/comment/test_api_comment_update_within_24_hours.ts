import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_update_within_24_hours(
  connection: api.IConnection,
): Promise<void> {
  // Test member comment update within 24 hours content validation and timestamp update
  // 1. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  // 2. Create comment using update with 'new' as commentId to simulate creation
  const comment = await api.functional.reddit.member.comments.update(
    memberConnection,
    {
      commentId: "new",
      body: {
        content: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 10,
          wordMax: 20,
        }),
      } satisfies IRedditComment.IUpdate,
    },
  );
  typia.assert(comment);
  // 3. Update comment within 24 hours
  const newContent = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  });
  const updatedComment = await api.functional.reddit.member.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        content: newContent,
      } satisfies IRedditComment.IUpdate,
    },
  );
  typia.assert(updatedComment);
  // 4. Validate update
  TestValidator.equals("content matches", updatedComment.content, newContent);
  TestValidator.predicate(
    "updated time within 24 hours",
    new Date().getTime() - new Date(updatedComment.updated_at).getTime() <
      24 * 60 * 60 * 1000,
  );
}
