import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_deletion_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create Member A connection and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Upload an attachment as Member A
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberAConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(1),
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Create Member B connection and authenticate (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Attempt to delete Member A's attachment using Member B's connection
  // This should fail with 403 Forbidden due to ownership verification
  await TestValidator.httpError(
    "non-owner deletion should be rejected with 403 Forbidden",
    403,
    async () => {
      await api.functional.redditLike.member.attachments.erase(
        memberBConnection,
        {
          attachmentId: attachment.id,
        },
      );
    },
  );
}
