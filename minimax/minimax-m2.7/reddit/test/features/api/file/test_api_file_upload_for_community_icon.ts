import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_file_upload_for_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Step 2: Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // Step 3: Use a pre-generated valid PNG image (100x100 pixels, solid color RGB)
  // This is a valid 100x100 PNG file encoded in base64
  const base64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACx" +
    "jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGJSURBVHhe7dMxAQAgDMAwKomf/N3QB" +
    "gy4kxY3b5H0m7AJJAkkgCSSBJJAEDp1AWt4FaPkI0PIRoOUjQMtHgJaPAC0fAVo+ArR8BGj5" +
    "CNDyEaDlI0DLR4CWjwAtHwFaPgK0fARo+QjQ8hGg5SNAy0eAlo8ALR8BWj4CtHwEaPkI0PIR" +
    "oOUjQMtHgJaPAC0fAVo+ArR8BGj5CNDyEaDlI0DLR4CWjwAtHwFaPgK0fARo+QjQ8hGg5SNA" +
    "y0eAlo8ALR8BWj4CtHwEaPkI0PIR4OrqPwVe4N+7AAAAAElFTkSuQmCC";
  // Step 4: Upload the file as community icon
  const file = await api.functional.redditClone.member.files.create(
    memberConnection,
    {
      body: {
        file_data: base64Image,
        mime_type: "image/png",
        original_filename: "community_icon.png",
        target_id: community.id,
        target_type: "community",
      } satisfies IRedditCloneFile.ICreate,
    },
  );
  // Step 5: Validate response
  typia.assert(file);
  // Step 6: Verify file metadata
  TestValidator.equals("mime type is png", file.mimeType, "image/png");
  TestValidator.equals(
    "original filename matches",
    file.originalFilename,
    "community_icon.png",
  );
  TestValidator.predicate(
    "file size is within range (1KB-5MB)",
    file.fileSize >= 1024 && file.fileSize <= 5242880,
  );
  TestValidator.predicate(
    "status is valid",
    file.status === "pending" ||
      file.status === "scanning" ||
      file.status === "processed",
  );
  TestValidator.equals(
    "uploader id matches member",
    file.uploader.id,
    authorized.id,
  );
  // Step 7: Verify associations
  TestValidator.predicate("has associations", file.associations.length > 0);
  const communityAssociation = file.associations.find(
    (a) => a.target_type === "community",
  );
  TestValidator.notEquals(
    "community association exists",
    communityAssociation,
    null,
  );
  TestValidator.equals(
    "target id matches community",
    communityAssociation!.target_id,
    community.id,
  );
  TestValidator.equals(
    "target type is community",
    communityAssociation!.target_type,
    "community",
  );
  // Step 8: Verify thumbnails and scans arrays are present
  TestValidator.predicate(
    "thumbnails array exists",
    Array.isArray(file.thumbnails),
  );
  TestValidator.predicate("scans array exists", Array.isArray(file.scans));
}
