import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_ban_reasons_create } from "../../../generate/generate_random_community_platform_admin_ban_reasons_create";
import { prepare_random_community_platform_ban_reason } from "../../../prepare/prepare_random_community_platform_ban_reason";

export async function test_api_ban_reason_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Prepare ban reason creation data
  const createBody: ICommunityPlatformBanReason.ICreate = {
    code: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    // active intentionally omitted to test default value
  };
  // 3. Create ban reason with utility function
  const banReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(banReason);
  // 4. Validate business logic
  TestValidator.equals("code matches input", banReason.code, createBody.code);
  TestValidator.equals(
    "title matches input",
    banReason.title,
    createBody.title,
  );
  TestValidator.equals(
    "description matches input",
    banReason.description,
    createBody.description,
  );
  TestValidator.equals(
    "severity matches input",
    banReason.severity,
    createBody.severity,
  );
  TestValidator.predicate("active defaults to true", banReason.active === true);
  TestValidator.predicate("has UUID id", /^[0-9a-f-]{36}$/i.test(banReason.id));
  TestValidator.predicate(
    "created_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(banReason.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(banReason.updated_at),
  );
  TestValidator.equals("deleted_at is null", banReason.deleted_at, null);
}
