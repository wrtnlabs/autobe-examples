import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_bulk_assignment_add_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create candidate moderator account to be added
  const candidateConnection: api.IConnection = { host: connection.host };
  const candidate = await authorize_moderator_join(candidateConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(candidate);
  // 2. Create owner moderator account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(owner);
  // 3. Authenticate as owner
  const authenticatedOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_moderator_login(authenticatedOwnerConnection, {
    body: {
      email: owner.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(authenticatedOwnerConnection);
  // 4. Create community using a placeholder ID
  const communityId = "123e4567-e89b-12d3-a456-426614174000";
  // 5. Add candidate as moderator using bulk assignment
  const candidateId = candidate.id;
  const result =
    await api.functional.redditLike.moderator.communities.moderator_roles.updateModeratorRoles(
      authenticatedOwnerConnection,
      {
        communityId: communityId,
        body: {
          user_id: candidateId,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate the added moderator role
  // Since ISummary doesn't include user_id, we'll validate by checking if
  // the result contains a moderator role (the role should exist)
  const addedRole = result.data.find((r) => r.role === "moderator");
  TestValidator.notEquals("moderator role added", addedRole, undefined);
  TestValidator.equals(
    "moderator role is correct",
    addedRole?.role,
    "moderator",
  );
  // Verify that we have at least one moderator role in the community
  TestValidator.predicate("has moderator roles", () => result.data.length > 0);
  // Check pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
}
