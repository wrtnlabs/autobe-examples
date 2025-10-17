import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";

export async function test_api_site_setting_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1) Administrator registration (creates auth token automatically on join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12); // >=10 chars

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // Note: api.functional.auth.administrator.join sets connection.headers.Authorization

  // 2) Prepare update payload (IEconPoliticalForumSiteSetting.IUpdate)
  const newValue = JSON.stringify({
    featureEnabled: true,
    seed: RandomGenerator.alphaNumeric(8),
  });
  const newDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 10,
  });
  const updateBody = {
    value: newValue,
    description: newDescription,
    is_public: true,
  } satisfies IEconPoliticalForumSiteSetting.IUpdate;

  // 3) Perform the update request
  const updated: IEconPoliticalForumSiteSetting =
    await api.functional.econPoliticalForum.administrator.siteSettings.put(
      connection,
      {
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4) Assertions: HTTP-level / response validations
  TestValidator.equals(
    "site setting value updated",
    updated.value,
    updateBody.value!,
  );
  TestValidator.equals(
    "site setting description updated",
    updated.description,
    updateBody.description!,
  );
  TestValidator.equals(
    "site setting is_public updated",
    updated.is_public,
    updateBody.is_public!,
  );

  // 5) Business invariant: updated_at must be more recent than created_at
  TestValidator.predicate(
    "updated_at must be more recent than created_at",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );

  // 6) Teardown note: Actual DB rollback/reset is expected to be handled by the test harness/fixtures.
}
