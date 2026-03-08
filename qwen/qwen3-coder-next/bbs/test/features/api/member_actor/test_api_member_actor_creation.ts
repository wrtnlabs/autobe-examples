import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_actors_create } from "../../../generate/generate_random_discussion_board_super_admin_actors_create";
import { prepare_random_discussion_board_member } from "../../../prepare/prepare_random_discussion_board_member";

export async function test_api_member_actor_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authorization
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Login as super admin to obtain JWT token
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_login(loginConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create connection with super admin JWT token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 3. Create member actor
  const createdMember =
    await api.functional.discussionBoard.superAdmin.actors.create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: "$2b$10$" + RandomGenerator.alphaNumeric(53),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
  typia.assert(createdMember);
  // 4. Validate created member
  TestValidator.equals("email matches", createdMember.email, authorized.email);
  TestValidator.equals("role is member", createdMember.role, "member" as const);
  TestValidator.equals("is_banned is false", createdMember.is_banned, false);
  TestValidator.equals("deleted_at is null", createdMember.deleted_at, null);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdMember.id,
    ),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    !!createdMember.created_at,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    !!createdMember.updated_at,
  );
  // 5. Test bio field can be null
  const memberWithNullBio =
    await api.functional.discussionBoard.superAdmin.actors.create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password_hash: "$2b$10$" + RandomGenerator.alphaNumeric(53),
          display_name: RandomGenerator.name(),
          bio: null,
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
  typia.assert(memberWithNullBio);
  TestValidator.equals("bio is null", memberWithNullBio.bio, null);
}
