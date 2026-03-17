import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_no_change_submission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const baselineProfile = authorized.profile;
  typia.assert(baselineProfile);
  const avatarInput = (() => {
    if (baselineProfile.files.length === 0) return undefined;
    const avatarFile = baselineProfile.files[0];
    return {
      category: avatarFile.category,
      original_name: avatarFile.original_name,
      extension: avatarFile.extension,
      mime_type: avatarFile.mime_type,
      size: avatarFile.size,
      url: avatarFile.url,
    } satisfies ICommunityPlatformProfileFile.IUpdate;
  })();
  const body = {
    display_name: baselineProfile.display_name,
    bio: baselineProfile.bio,
    avatar: avatarInput,
  } satisfies ICommunityPlatformProfile.IUpdate;
  const updated = await api.functional.communityPlatform.member.profile.update(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(updated);
  TestValidator.equals("profile id unchanged", updated.id, baselineProfile.id);
  TestValidator.equals(
    "display name unchanged",
    updated.display_name,
    baselineProfile.display_name,
  );
  TestValidator.equals("bio unchanged", updated.bio, baselineProfile.bio);
  TestValidator.equals(
    "ownership unchanged",
    updated.member,
    baselineProfile.member,
  );
  TestValidator.equals("karma unchanged", updated.karma, baselineProfile.karma);
  TestValidator.equals("posts unchanged", updated.posts, baselineProfile.posts);
  TestValidator.equals(
    "comments unchanged",
    updated.comments,
    baselineProfile.comments,
  );
  TestValidator.equals("files unchanged", updated.files, baselineProfile.files);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    baselineProfile.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    baselineProfile.deleted_at,
  );
}
