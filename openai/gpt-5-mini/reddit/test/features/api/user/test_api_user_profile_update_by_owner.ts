import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1) Create a fresh member via join
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const initialDisplay = RandomGenerator.name();

  const joinBody = {
    username,
    email,
    password,
    display_name: initialDisplay,
  } satisfies ICommunityPortalMember.ICreate;

  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Prepare update payload (only editable fields allowed by IUpdate)
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 8 });
  const newAvatar = typia.random<string & tags.Format<"uri">>();

  const updateBody = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_uri: newAvatar,
  } satisfies ICommunityPortalUser.IUpdate;

  // 3) Call update as the authenticated owner
  const updated: ICommunityPortalUser.ISummary =
    await api.functional.communityPortal.member.users.update(connection, {
      userId: authorized.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4) Assertions: id preserved and fields updated as requested
  TestValidator.equals(
    "user id should remain the same",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "display_name should be updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio should be updated", updated.bio, newBio);
  TestValidator.equals(
    "avatar_uri should be updated",
    updated.avatar_uri,
    newAvatar,
  );

  // Ensure updated_at is later than created_at (temporal ordering)
  TestValidator.predicate(
    "updated_at must be later than created_at",
    () => new Date(updated.updated_at) > new Date(updated.created_at),
  );

  // typia.assert(updated) already guarantees the response does not include
  // sensitive storage fields (e.g., password_hash) because ICommunityPortalUser.ISummary
  // does not define them. No explicit access to non-schema properties is performed.
}
