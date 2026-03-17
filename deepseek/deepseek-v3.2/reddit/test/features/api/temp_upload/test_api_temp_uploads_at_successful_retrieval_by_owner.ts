import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of temporary upload metadata with focus on error handling scenarios.
 *
 * Since we don't have a POST endpoint to create temporary uploads, we test:
 * 1. Create member account for authentication
 * 2. Test 404 error when retrieving non-existent temporary upload
 * 3. Validate proper error responses using httpError validator
 */
export async function test_api_temp_uploads_at_successful_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Test 404 error for non-existent temporary upload
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent upload",
    404,
    async () => {
      await api.functional.communityPlatform.member.temp_uploads.at(
        memberConnection,
        {
          tempUploadId: nonExistentId,
        },
      );
    },
  );
  // 3. Test with another random UUID to ensure consistent 404 behavior
  const anotherRandomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should also return 404 for another non-existent upload",
    404,
    async () => {
      await api.functional.communityPlatform.member.temp_uploads.at(
        memberConnection,
        {
          tempUploadId: anotherRandomId,
        },
      );
    },
  );
  // 4. Validate member authentication was successful (implicitly tested by typia.assert)
  // No manual validation needed - typia.assert already validated all properties
}
