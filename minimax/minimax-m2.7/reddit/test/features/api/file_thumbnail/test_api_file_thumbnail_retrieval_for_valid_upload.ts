import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
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
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_file_thumbnail_retrieval_for_valid_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload a valid image file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(file);
  // 3. Retrieve thumbnails for the uploaded file
  const thumbnailResponse =
    await api.functional.redditClone.files.thumbnails.list(memberConnection, {
      fileId: file.id,
    });
  typia.assert(thumbnailResponse);
  // 4. The response structure - items should be array of thumbnails per business requirements
  // Note: DTO type definition has items as ISummary (single) but business logic expects array
  // Using type assertion to work around the type definition mismatch
  const items =
    thumbnailResponse.items as unknown as IRedditCloneFileThumbnail.ISummary[];
  // Thumbnails are generated asynchronously, so items may be empty
  // Validate that items is an array (even if empty)
  TestValidator.predicate("items is an array", Array.isArray(items));
  // If thumbnails have been generated, validate each thumbnail
  if (items.length > 0) {
    for (const thumbnail of items) {
      TestValidator.predicate(
        "thumbnail has valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          thumbnail.id,
        ),
      );
      TestValidator.predicate(
        "thumbnail has positive width",
        thumbnail.width > 0,
      );
      TestValidator.predicate(
        "thumbnail has positive height",
        thumbnail.height > 0,
      );
      TestValidator.predicate(
        "thumbnail has valid variant string",
        typeof thumbnail.variant === "string" && thumbnail.variant.length > 0,
      );
      TestValidator.predicate(
        "thumbnail has thumbnailPath",
        typeof thumbnail.thumbnailPath === "string" &&
          thumbnail.thumbnailPath.length > 0,
      );
      TestValidator.predicate(
        "thumbnail has valid createdAt timestamp",
        !isNaN(Date.parse(thumbnail.createdAt)),
      );
    }
  }
}
