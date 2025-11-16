import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_visibility_level_partial_update_preserves_unchanged_fields(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so subsequent calls run with platformAdmin privileges.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial community visibility level with known code, name, and description.
  const initialVisibilityCode: string = `vis-${RandomGenerator.alphabets(8)}`;
  const initialName: string = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 4,
  });

  const createBody = {
    code: initialVisibilityCode,
    name: initialName,
    description: initialDescription,
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity-check that the created record matches our requested fields.
  TestValidator.equals(
    "created visibility level code should match input code",
    created.code,
    initialVisibilityCode,
  );
  TestValidator.equals(
    "created visibility level name should match input name",
    created.name,
    initialName,
  );

  // description was provided in the create body, ensure it matches.
  const createdDescription: string = typia.assert<string>(created.description);
  TestValidator.equals(
    "created visibility level description should match input description",
    createdDescription,
    initialDescription,
  );

  // Capture baseline immutable and mutable fields for later comparison.
  const baselineId: string = created.id;
  const baselineCode: string = created.code;
  const baselineName: string = created.name;
  const baselineDescription: string = createdDescription;
  const baselineCreatedAt: string = created.created_at;
  const baselineUpdatedAt: string = created.updated_at;
  const baselineDeletedAt: string | null | undefined = created.deleted_at;

  // 3. Perform partial update: only change description, omit name.
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });

  const updateBody = {
    description: updatedDescription,
  } satisfies ICommunityPlatformCommunityVisibilityLevel.IUpdate;

  const updated: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.update(
      connection,
      {
        visibilityLevelCode: baselineCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate immutable fields and omitted field behavior.
  TestValidator.equals(
    "id must remain unchanged after partial update",
    updated.id,
    baselineId,
  );
  TestValidator.equals(
    "code must remain unchanged after partial update",
    updated.code,
    baselineCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after partial update",
    updated.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged after partial update",
    updated.deleted_at ?? null,
    baselineDeletedAt ?? null,
  );

  // name was omitted in update payload, so it should remain exactly as before.
  TestValidator.equals(
    "name should be preserved when omitted from partial update payload",
    updated.name,
    baselineName,
  );

  // description was provided, so it must change to the new value.
  const updatedDescValue: string = typia.assert<string>(updated.description);
  TestValidator.equals(
    "description should be updated when provided in partial update payload",
    updatedDescValue,
    updatedDescription,
  );

  // updated_at should reflect an update and therefore differ from the baseline.
  TestValidator.notEquals(
    "updated_at should change after partial update",
    updated.updated_at,
    baselineUpdatedAt,
  );
}
