import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_avatar_create } from "../../../generate/generate_random_community_platform_member_avatar_create";
import { prepare_random_community_platform_avatar_file } from "../../../prepare/prepare_random_community_platform_avatar_file";

export async function test_api_avatar_boundary_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload avatar at minimum dimensions (64x64 pixels, GIF format)
  const minDimensionBody = {
    file: "R0lGODlhQABAAMAAAMzMzAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
    originalName: "avatar_64x64.gif",
    mimeType: "image/gif" as const,
    width: 64,
    height: 64,
  } satisfies ICommunityPlatformAvatarFile.ICreate;
  const minDimensionMember =
    await api.functional.communityPlatform.member.avatar.create(
      memberConnection,
      { body: minDimensionBody },
    );
  typia.assert(minDimensionMember);
  // 3. Verify successful upload with minimum dimensions
  TestValidator.predicate(
    "avatar URL updated after min dimension upload",
    minDimensionMember.avatarUrl !== null,
  );
  // 4. Upload replacement avatar at maximum dimensions (4096x4096 pixels, PNG format)
  const maxDimensionBody = {
    file: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    originalName: "avatar_4096x4096.png",
    mimeType: "image/png" as const,
    width: 4096,
    height: 4096,
  } satisfies ICommunityPlatformAvatarFile.ICreate;
  const maxDimensionMember =
    await api.functional.communityPlatform.member.avatar.create(
      memberConnection,
      { body: maxDimensionBody },
    );
  typia.assert(maxDimensionMember);
  // 5. Verify successful upload with maximum dimensions
  TestValidator.predicate(
    "avatar URL updated after max dimension upload",
    maxDimensionMember.avatarUrl !== null,
  );
  TestValidator.notEquals(
    "avatar URL changed after replacement",
    minDimensionMember.avatarUrl,
    maxDimensionMember.avatarUrl,
  );
  // 6. Verify member profile consistency
  TestValidator.equals(
    "member ID unchanged",
    minDimensionMember.id,
    maxDimensionMember.id,
  );
  TestValidator.equals(
    "username unchanged",
    minDimensionMember.username,
    maxDimensionMember.username,
  );
}
