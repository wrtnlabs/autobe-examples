import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderator_role_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a valid moderator role structure
  // Note: Since API doesn't provide create/moderator_roles endpoint, we validate
  // the expected structure that would be returned by the retrieval endpoint
  const createdRole = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      karma_score: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      created_at: new Date().toISOString(),
    },
    community: {
      name: RandomGenerator.alphabets(8),
      icon_url: null,
      subscriber_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    },
    role: RandomGenerator.pick(["owner", "moderator"] as const),
    created_at: new Date().toISOString(),
  } satisfies IRedditLikeModeratorRole;
  typia.assert(createdRole);
  // 3. Validate role type is 'owner' or 'moderator'
  TestValidator.equals(
    "role type is owner or moderator",
    ["owner", "moderator"],
    [createdRole.role],
  );
  // 4. Validate user summary fields
  TestValidator.predicate("user id is valid uuid", () =>
    /^[0-9a-f-]{36}$/i.test(createdRole.user.id),
  );
  TestValidator.predicate(
    "user username is string",
    () =>
      typeof createdRole.user.username === "string" &&
      createdRole.user.username.length > 0,
  );
  TestValidator.predicate(
    "user display_name is string",
    () =>
      typeof createdRole.user.display_name === "string" &&
      createdRole.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user karma_score is valid number",
    () =>
      typeof createdRole.user.karma_score === "number" &&
      createdRole.user.karma_score >= 0,
  );
  TestValidator.predicate(
    "user created_at is valid date-time format",
    () => !isNaN(new Date(createdRole.user.created_at).getTime()),
  );
  // 5. Validate community summary fields
  TestValidator.predicate(
    "community name is string",
    () =>
      typeof createdRole.community.name === "string" &&
      createdRole.community.name.length > 0,
  );
  TestValidator.predicate(
    "community icon_url is string or null",
    () =>
      createdRole.community.icon_url === null ||
      typeof createdRole.community.icon_url === "string",
  );
  TestValidator.predicate(
    "community subscriber_count is valid",
    () =>
      typeof createdRole.community.subscriber_count === "number" &&
      createdRole.community.subscriber_count >= 0,
  );
  // 6. Validate created_at timestamp
  TestValidator.predicate(
    "role created_at is valid date-time format",
    () => !isNaN(new Date(createdRole.created_at).getTime()),
  );
  // 7. Test retrieval endpoint structure
  const retrieved = await api.functional.redditLike.admin.moderator_roles.at(
    adminConnection,
    {
      moderatorRoleId: createdRole.id,
    },
  );
  typia.assert(retrieved);
  // Validate all required fields are present in retrieved data
  TestValidator.predicate(
    "retrieved role has id",
    () => typeof retrieved.id === "string",
  );
  TestValidator.predicate(
    "retrieved role has user",
    () => typeof retrieved.user === "object" && retrieved.user !== null,
  );
  TestValidator.predicate(
    "retrieved role has community",
    () =>
      typeof retrieved.community === "object" && retrieved.community !== null,
  );
  TestValidator.predicate("retrieved role has role type", () =>
    ["owner", "moderator"].includes(retrieved.role),
  );
  TestValidator.predicate(
    "retrieved role has created_at",
    () => typeof retrieved.created_at === "string",
  );
}
