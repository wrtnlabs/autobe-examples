import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Upload image to section
  const imageBody = {
    filename: `${RandomGenerator.alphabets(8)}.jpg`,
    mime_type: "image/jpeg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
    >(),
    image_type: RandomGenerator.pick([
      "banner",
      "icon",
      "promotional",
      "thumbnail",
    ] as const),
    storage_path: `/images/sections/${section.id}/${RandomGenerator.alphabets(16)}.jpg`,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardSectionImage.ICreate;
  const image =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        body: imageBody,
        params: { sectionId: section.id },
      },
    );
  typia.assert(image);
  // Test 1: Attempt to retrieve image without proper authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "missing authorization header",
    401,
    async () => {
      await api.functional.discussionBoard.admin.sections.images.at(
        unauthorizedConnection,
        {
          sectionId: section.id,
          imageId: image.id,
        },
      );
    },
  );
  // Test 2: Test mismatched sectionId (valid imageId but wrong section)
  const wrongSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "image does not belong to section",
    404,
    async () => {
      await api.functional.discussionBoard.admin.sections.images.at(
        adminConnection,
        {
          sectionId: wrongSectionId,
          imageId: image.id,
        },
      );
    },
  );
  // Test 3: Test non-existent imageId
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("non-existent image", 404, async () => {
    await api.functional.discussionBoard.admin.sections.images.at(
      adminConnection,
      {
        sectionId: section.id,
        imageId: nonExistentImageId,
      },
    );
  });
  // Test 4: Verify valid retrieval works with proper authorization
  const validImage =
    await api.functional.discussionBoard.admin.sections.images.at(
      adminConnection,
      {
        sectionId: section.id,
        imageId: image.id,
      },
    );
  typia.assert(validImage);
  TestValidator.equals("valid image retrieval", validImage.id, image.id);
  TestValidator.equals("filename matches", validImage.filename, image.filename);
  TestValidator.equals(
    "mime type matches",
    validImage.mime_type,
    image.mime_type,
  );
}
