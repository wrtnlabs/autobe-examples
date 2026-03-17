import api from "@ORGANIZATION/PROJECT-api";
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

export async function test_api_member_detail_existing_account_with_profile_projection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const first: ICommunityPlatformMember =
    await api.functional.communityPlatform.members.at(memberConnection, {
      memberId,
    });
  typia.assert(first);
  const second: ICommunityPlatformMember =
    await api.functional.communityPlatform.members.at(memberConnection, {
      memberId,
    });
  typia.assert(second);
  TestValidator.equals(
    "member detail is stable across repeated reads",
    second,
    first,
  );
  TestValidator.equals(
    "account code is stable across repeated reads",
    second.code,
    first.code,
  );
  TestValidator.equals(
    "account email is stable across repeated reads",
    second.email,
    first.email,
  );
  TestValidator.equals(
    "email verification flag is stable across repeated reads",
    second.emailVerified,
    first.emailVerified,
  );
  TestValidator.equals(
    "account status is stable across repeated reads",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "last signed in timestamp is stable across repeated reads",
    second.lastSignedInAt,
    first.lastSignedInAt,
  );
  TestValidator.equals(
    "member created timestamp is unchanged by retrieval",
    second.createdAt,
    first.createdAt,
  );
  TestValidator.equals(
    "member updated timestamp is unchanged by retrieval",
    second.updatedAt,
    first.updatedAt,
  );
  TestValidator.equals(
    "member deleted timestamp is unchanged by retrieval",
    second.deletedAt,
    first.deletedAt,
  );
  TestValidator.equals(
    "public profile display name is stable across repeated reads",
    second.profile.display_name,
    first.profile.display_name,
  );
  TestValidator.equals(
    "public profile bio is stable across repeated reads",
    second.profile.bio,
    first.profile.bio,
  );
  TestValidator.equals(
    "profile karma is stable across repeated reads",
    second.profile.karma,
    first.profile.karma,
  );
  TestValidator.equals(
    "profile files are stable across repeated reads",
    second.profile.files,
    first.profile.files,
  );
  TestValidator.equals(
    "profile posts are stable across repeated reads",
    second.profile.posts,
    first.profile.posts,
  );
  TestValidator.equals(
    "profile comments are stable across repeated reads",
    second.profile.comments,
    first.profile.comments,
  );
  TestValidator.equals(
    "profile created timestamp is unchanged by retrieval",
    second.profile.created_at,
    first.profile.created_at,
  );
  TestValidator.equals(
    "profile updated timestamp is unchanged by retrieval",
    second.profile.updated_at,
    first.profile.updated_at,
  );
  TestValidator.equals(
    "profile deleted timestamp is unchanged by retrieval",
    second.profile.deleted_at,
    first.profile.deleted_at,
  );
}
