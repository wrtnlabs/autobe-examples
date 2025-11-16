import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an administrator can update community metadata fields without
 * changing immutable slug, and that validation rules are enforced.
 *
 * 1. Register user
 * 2. User creates a community
 * 3. Register administrator
 * 4. Authenticate as administrator
 * 5. Update the community with new display_title, description, visibility,
 *    image_url and status
 * 6. Validate returned data matches the update
 * 7. Validation: update should fail when admin submits invalid field values
 *    (min/max lengths, enums)
 */
export async function test_api_community_update_by_administrator(
  connection: api.IConnection,
) {
  // Register and login normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://app.community.test/login",
      referrer: "https://app.community.test/",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // User creates a community
  const baseCommunityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const createBody = {
    name: baseCommunityName satisfies string,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 10,
    }) satisfies string,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 2,
      sentenceMax: 5,
      wordMin: 2,
      wordMax: 10,
    }) satisfies string,
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    image_url: RandomGenerator.pick([
      null,
      typia.random<string & tags.Format<"uri">>(),
    ]),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createBody,
    });
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    createBody.name,
  );

  // Register and login administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.community.test/admin",
      referrer: "https://admin.community.test/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Administrator updates the community
  const updateFields = {
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 2,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    image_url: RandomGenerator.pick([
      null,
      typia.random<string & tags.Format<"uri">>(),
    ]),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityName: createdCommunity.name,
        body: updateFields,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "display_title updated",
    updatedCommunity.display_title,
    updateFields.display_title,
  );
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updateFields.description,
  );
  TestValidator.equals(
    "visibility updated",
    updatedCommunity.visibility,
    updateFields.visibility,
  );
  TestValidator.equals(
    "image_url updated",
    updatedCommunity.image_url,
    updateFields.image_url,
  );
  TestValidator.equals(
    "status updated",
    updatedCommunity.status,
    updateFields.status,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedCommunity.updated_at !== createdCommunity.updated_at,
  );

  // Validate field length: display_title min/max, description min/max
  await TestValidator.error(
    "admin submits display_title with zero length",
    async () => {
      await api.functional.communityPlatform.administrator.communities.update(
        connection,
        {
          communityName: createdCommunity.name,
          body: {
            ...updateFields,
            display_title: "",
          },
        },
      );
    },
  );
  await TestValidator.error(
    "admin submits display_title too long",
    async () => {
      await api.functional.communityPlatform.administrator.communities.update(
        connection,
        {
          communityName: createdCommunity.name,
          body: {
            ...updateFields,
            display_title: RandomGenerator.paragraph({
              sentences: 101,
              wordMin: 1,
              wordMax: 1,
            }),
          },
        },
      );
    },
  );
  await TestValidator.error("admin submits description too long", async () => {
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityName: createdCommunity.name,
        body: {
          ...updateFields,
          description: RandomGenerator.content({
            paragraphs: 5,
            sentenceMin: 50,
            sentenceMax: 50,
            wordMin: 3,
            wordMax: 10,
          }),
        },
      },
    );
  });
  await TestValidator.error("admin submits description too short", async () => {
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityName: createdCommunity.name,
        body: {
          ...updateFields,
          description: "",
        },
      },
    );
  });
}
