import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_avatars_create } from "../../../generate/generate_random_reddit_clone_member_avatars_create";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_avatar_listing_filtered_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and upload avatar
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(firstMember);
  const firstAvatar = await generate_random_reddit_clone_member_avatars_create(
    firstMemberConnection,
    {},
  );
  typia.assert(firstAvatar);
  // 2. Register second member and upload avatar
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(secondMember);
  const secondAvatar = await generate_random_reddit_clone_member_avatars_create(
    secondMemberConnection,
    {},
  );
  typia.assert(secondAvatar);
  // 3. Query avatar listing filtered by first member's userId
  const filteredResponse =
    await api.functional.redditClone.member.avatars.index(connection, {
      body: {
        userId: firstMember.id,
        limit: 10,
      } satisfies IRedditCloneFileAssociation.IRequest,
    });
  typia.assert(filteredResponse);
  // 4. Validate only first member's avatars are returned
  TestValidator.equals(
    "should return avatars for first member",
    filteredResponse.data.length > 0,
    true,
  );
  // 5. Verify all returned avatars belong to first member
  for (const avatar of filteredResponse.data) {
    TestValidator.equals(
      "avatar userId matches first member",
      avatar.userId,
      firstMember.id,
    );
  }
  // 6. Verify first member's avatar is in the response
  const firstAvatarFound = filteredResponse.data.some(
    (avatar) => avatar.id === firstAvatar.id,
  );
  TestValidator.equals(
    "first member avatar should be in filtered response",
    firstAvatarFound,
    true,
  );
  // 7. Verify second member's avatar is NOT in the response
  const secondAvatarFound = filteredResponse.data.some(
    (avatar) => avatar.id === secondAvatar.id,
  );
  TestValidator.equals(
    "second member avatar should not be in filtered response",
    secondAvatarFound,
    false,
  );
}
