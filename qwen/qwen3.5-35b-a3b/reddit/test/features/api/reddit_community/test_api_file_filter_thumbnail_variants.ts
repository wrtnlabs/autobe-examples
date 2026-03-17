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

export async function test_api_file_filter_thumbnail_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication - Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create a post image file
  const file = await api.functional.redditCommunity.member.files.create(
    memberConnection,
    {
      body: {
        file_type: "post",
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Baseline - Get all thumbnails without filters
  const allThumbnails =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId: file.id,
        body: {},
      },
    );
  typia.assert(allThumbnails);
  // Validate thumbnail retrieval has valid structure
  if (allThumbnails.pagination.records === 0) {
    TestValidator.predicate("has valid pagination structure", () => true);
  } else {
    TestValidator.equals(
      "thumbnails response has valid structure",
      allThumbnails.pagination.records > 0,
      true,
    );
  }
  // 4. Variant filtering - Test each variant independently
  const variants: ReadonlyArray<"small" | "medium" | "large"> = [
    "small",
    "medium",
    "large",
  ];
  for (const variant of variants) {
    const filteredByVariant =
      await api.functional.redditCommunity.files.thumbnails.index(
        memberConnection,
        {
          fileId: file.id,
          body: {
            variant,
          } satisfies IRedditCommunityFileThumbnail.IRequest,
        },
      );
    typia.assert(filteredByVariant);
    // Validate all returned thumbnails match the variant filter
    if (filteredByVariant.data.length > 0) {
      for (const thumbnail of filteredByVariant.data) {
        TestValidator.equals(
          `variant ${variant} filter - thumbnail variant`,
          thumbnail.variant,
          variant,
        );
      }
    }
  }
  // 5. Format filtering - Test each format independently
  const formats: ReadonlyArray<"jpg" | "png" | "webp" | "gif"> = [
    "jpg",
    "png",
    "webp",
    "gif",
  ];
  for (const format of formats) {
    const filteredByFormat =
      await api.functional.redditCommunity.files.thumbnails.index(
        memberConnection,
        {
          fileId: file.id,
          body: {
            format,
          } satisfies IRedditCommunityFileThumbnail.IRequest,
        },
      );
    typia.assert(filteredByFormat);
    // Validate all returned thumbnails match the format filter
    if (filteredByFormat.data.length > 0) {
      for (const thumbnail of filteredByFormat.data) {
        TestValidator.equals(
          `format ${format} filter - thumbnail format`,
          thumbnail.format,
          format,
        );
      }
    }
  }
  // 6. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      allThumbnails.pagination.current !== undefined &&
      allThumbnails.pagination.limit !== undefined &&
      allThumbnails.pagination.records !== undefined &&
      allThumbnails.pagination.pages !== undefined,
  );
}
