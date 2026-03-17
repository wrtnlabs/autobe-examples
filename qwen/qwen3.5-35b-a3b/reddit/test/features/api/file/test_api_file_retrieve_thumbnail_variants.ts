import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_retrieve_thumbnail_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a post image file
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const file = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: memberId,
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Retrieve thumbnail variants
  const thumbnails =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId: file.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
        } satisfies IRedditCommunityFileThumbnail.IRequest,
      },
    );
  typia.assert(thumbnails);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination has records count",
    thumbnails.pagination.records,
    thumbnails.pagination.records,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    thumbnails.pagination.limit > 0,
  );
  // Validate each thumbnail has correct fields
  for (const thumbnail of thumbnails.data) {
    typia.assertGuard(thumbnail);
    // Validate required fields exist
    TestValidator.predicate("thumbnail has id", thumbnail.id !== "");
    TestValidator.predicate("thumbnail has URL", thumbnail.thumbnailUrl !== "");
    TestValidator.predicate("thumbnail has width", thumbnail.width > 0);
    TestValidator.predicate("thumbnail has height", thumbnail.height > 0);
    TestValidator.predicate("thumbnail has format", thumbnail.format !== "");
    TestValidator.predicate("thumbnail has variant", thumbnail.variant !== "");
    TestValidator.predicate(
      "thumbnail has creation timestamp",
      thumbnail.createdAt !== "",
    );
    // Validate variant types
    TestValidator.predicate(
      "variant is valid type",
      ["small", "medium", "large"].includes(thumbnail.variant),
    );
    // Validate format types
    TestValidator.predicate(
      "format is valid type",
      ["jpg", "png", "webp", "gif"].includes(thumbnail.format),
    );
    // Validate file linkage
    typia.assertGuard(thumbnail.redditCommunityFile);
    TestValidator.equals(
      "thumbnail linked to correct file",
      thumbnail.redditCommunityFile.id,
      file.id,
    );
    // Validate active status (deleted_at should be null for active thumbnails)
    TestValidator.equals("thumbnail is active", thumbnail.deletedAt, null);
  }
}
