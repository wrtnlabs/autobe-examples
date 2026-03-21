import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileThumbnail";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
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
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_thumbnail_public_access_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to upload the file
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload an image file that will be publicly viewable
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        ).toString("base64"),
        mime_type: "image/png",
        original_filename: "test_thumbnail.png",
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // 4. Verify file status
  TestValidator.predicate(
    "file status is valid",
    ["pending", "scanning", "processed", "failed"].includes(file.status),
  );
  // 5. Create a new connection without authentication (guest)
  const guestConnection: api.IConnection = { host: connection.host };
  // No Authorization header - this is an unauthenticated guest request
  // 6. As guest, retrieve thumbnails without authentication
  const thumbnails = await api.functional.redditClone.files.thumbnails.index(
    guestConnection,
    {
      fileId: file.id,
      body: {} satisfies IRedditCloneFileThumbnail.IRequest,
    },
  );
  typia.assert(thumbnails);
  // 7. Validate response structure
  TestValidator.equals(
    "pagination exists",
    thumbnails.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    thumbnails.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    thumbnails.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    thumbnails.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    thumbnails.pagination.pages >= 0,
  );
  // 8. If thumbnails exist, validate their structure
  for (const thumbnail of thumbnails.data) {
    TestValidator.equals("thumbnail has id", thumbnail.id !== null, true);
    TestValidator.equals(
      "thumbnail has variant",
      thumbnail.variant !== null,
      true,
    );
    TestValidator.predicate("thumbnail has valid width", thumbnail.width > 0);
    TestValidator.predicate("thumbnail has valid height", thumbnail.height > 0);
    TestValidator.equals(
      "thumbnail has path",
      thumbnail.thumbnailPath !== null,
      true,
    );
    TestValidator.equals(
      "thumbnail has createdAt",
      thumbnail.createdAt !== null,
      true,
    );
  }
}
