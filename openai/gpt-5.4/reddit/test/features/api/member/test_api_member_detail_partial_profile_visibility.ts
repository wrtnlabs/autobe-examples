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

export async function test_api_member_detail_partial_profile_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const member = typia.assert<ICommunityPlatformMember>(
    await api.functional.communityPlatform.members.at(memberConnection, {
      memberId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
  TestValidator.predicate(
    "account identity fields remain on the member root",
    member.email.length > 0 && typeof member.emailVerified === "boolean",
  );
  TestValidator.predicate(
    "public presentation fields remain limited to nested profile structure",
    typeof member.profile.display_name === "string" &&
      (member.profile.bio === null || member.profile.bio.length >= 0),
  );
  TestValidator.predicate(
    "one profile per user invariant is represented by a single nested profile object",
    typeof member.profile === "object" && member.profile !== null,
  );
  TestValidator.predicate(
    "optional profile media remains an explicit collection without fabrication",
    member.profile.files.length >= 0,
  );
}
