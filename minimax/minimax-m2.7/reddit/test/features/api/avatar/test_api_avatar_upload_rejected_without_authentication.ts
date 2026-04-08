import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_avatar_upload_rejected_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Create a connection WITHOUT authentication headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Prepare a valid base64-encoded minimal PNG image data for avatar upload
  // This is a minimal 1x1 transparent PNG in base64 format
  const base64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  // Attempt to upload avatar without authentication - should return 401
  await TestValidator.httpError(
    "unauthenticated avatar upload should return 401",
    401,
    async () =>
      await api.functional.redditClone.member.avatars.create(
        unauthenticatedConnection,
        {
          body: {
            imageData: base64Image,
            filename: "test.png",
          } satisfies IRedditCloneFileAssociation.ICreate,
        },
      ),
  );
}
