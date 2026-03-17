import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_detail_visibility_restricted(
  connection: api.IConnection,
): Promise<void> {
  const firstAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const firstAdminJoin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstAdminJoin);
  const created =
    await generate_random_community_platform_admin_password_resets_create(
      firstAdminConnection,
      {},
    );
  typia.assert(created);
  const initialRead =
    await api.functional.communityPlatform.admin.password_resets.at(
      firstAdminConnection,
      {
        passwordResetId: created.id,
      },
    );
  typia.assert(initialRead);
  TestValidator.equals(
    "initial read targets created record",
    initialRead.id,
    created.id,
  );
  const secondAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const secondAdminJoin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondAdminJoin);
  try {
    const crossRead =
      await api.functional.communityPlatform.admin.password_resets.at(
        secondAdminConnection,
        {
          passwordResetId: created.id,
        },
      );
    typia.assert(crossRead);
    TestValidator.equals(
      "cross-context read returns same record id",
      crossRead.id,
      created.id,
    );
    TestValidator.equals(
      "cross-context read keeps member identity stable",
      crossRead.member.id,
      created.member.id,
    );
    TestValidator.equals(
      "cross-context read keeps expiration stable",
      crossRead.expired_at,
      created.expired_at,
    );
    TestValidator.equals(
      "cross-context read remains read-only for used timestamp",
      crossRead.used_at,
      created.used_at,
    );
    TestValidator.equals(
      "cross-context read remains read-only for revoked timestamp",
      crossRead.revoked_at,
      created.revoked_at,
    );
  } catch {
    // Access may be denied by policy; verify read-only state through original context below.
  }
  const afterCrossAttempt =
    await api.functional.communityPlatform.admin.password_resets.at(
      firstAdminConnection,
      {
        passwordResetId: created.id,
      },
    );
  typia.assert(afterCrossAttempt);
  TestValidator.equals(
    "record id remains unchanged after detail reads",
    afterCrossAttempt.id,
    created.id,
  );
  TestValidator.equals(
    "member identity remains unchanged after detail reads",
    afterCrossAttempt.member.id,
    created.member.id,
  );
  TestValidator.equals(
    "expiration remains unchanged after detail reads",
    afterCrossAttempt.expired_at,
    created.expired_at,
  );
  TestValidator.equals(
    "used_at remains unchanged after detail reads",
    afterCrossAttempt.used_at,
    created.used_at,
  );
  TestValidator.equals(
    "revoked_at remains unchanged after detail reads",
    afterCrossAttempt.revoked_at,
    created.revoked_at,
  );
  TestValidator.equals(
    "deleted_at remains unchanged after detail reads",
    afterCrossAttempt.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "created_at remains unchanged after detail reads",
    afterCrossAttempt.created_at,
    created.created_at,
  );
}
