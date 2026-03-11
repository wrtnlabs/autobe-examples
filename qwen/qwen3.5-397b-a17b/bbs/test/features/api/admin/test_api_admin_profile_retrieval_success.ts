import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the admin profile using the admin's own ID
  const profile = await api.functional.discussionBoard.admin.admins.at(
    adminConnection,
    {
      adminId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Validate the profile structure and content
  TestValidator.equals("admin ID matches", profile.id, authorized.id);
  TestValidator.equals("grade is regular", profile.grade, "regular");
  TestValidator.equals(
    "member display name matches",
    profile.member.display_name,
    authorized.member.display_name,
  );
  TestValidator.equals(
    "member bio matches",
    profile.member.bio,
    authorized.member.bio,
  );
  TestValidator.predicate(
    "member status is active",
    profile.member.status === "active",
  );
  TestValidator.predicate(
    "member is_admin flag is true",
    profile.member.is_admin === true,
  );
  TestValidator.predicate(
    "deleted_at is null for active admin",
    profile.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(profile.updated_at)),
  );
}
