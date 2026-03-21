import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_icons_upload_icon } from "../../../generate/generate_random_reddit_clone_member_communities_icons_upload_icon";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_icon } from "../../../prepare/prepare_random_reddit_clone_community_icon";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_community_icon_upload_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberA);
  // 2. Create community with member A (owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberB);
  // 4. Upload a valid image file with member B
  const fileData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ).toString("base64");
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberBConnection,
    {
      body: {
        file_data: fileData,
        mime_type: "image/png",
        original_filename: "icon.png",
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(uploadedFile);
  // 5. Attempt to upload icon to member A's community as member B
  // Expected: 403 Forbidden because only the community owner has permission
  await TestValidator.httpError(
    "non-owner cannot upload community icon",
    403,
    async () =>
      await api.functional.redditClone.member.communities.icons.uploadIcon(
        memberBConnection,
        {
          communityName: community.name,
          body: {
            iconFileId: uploadedFile.id,
          },
        },
      ),
  );
}
