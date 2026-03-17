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

export async function test_api_member_profile_update_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member - create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // 2. Upload avatar attachment file
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/avatar.jpg" as string &
            tags.Format<"uri">,
          originalFilename: "avatar.jpg",
        },
      },
    );
  typia.assert(attachment);
  // 3. Update profile with new display name
  const updatedUsername = RandomGenerator.name(1);
  const updatedProfile = await api.functional.redditLike.member.profile.update(
    memberConnection,
    {
      body: {
        username: updatedUsername,
      } satisfies IRedditLikeMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate profile update results
  TestValidator.equals(
    "updated username matches input",
    updatedProfile.username,
    updatedUsername,
  );
  TestValidator.equals(
    "email matches original",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "id matches authorized member",
    updatedProfile.id,
    authorized.id,
  );
  TestValidator.predicate(
    "updatedAt is more recent than createdAt",
    new Date(updatedProfile.updatedAt) >= new Date(updatedProfile.createdAt),
  );
}
