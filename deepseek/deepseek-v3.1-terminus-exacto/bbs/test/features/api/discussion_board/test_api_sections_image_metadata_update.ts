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

export async function test_api_sections_image_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create an initial image within the section
  const initialImage =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          image_type: "banner" as const,
          storage_path: `/images/sections/${section.id}/${RandomGenerator.alphabets(12)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // 4. Test full metadata update
  const fullUpdateBody = {
    filename: `${RandomGenerator.alphabets(10)}.png`,
    mime_type: "image/png",
    image_type: "promotional",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardSectionImage.IUpdate;
  const updatedImage =
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: fullUpdateBody,
      },
    );
  typia.assert(updatedImage);
  // Validate full update
  TestValidator.equals(
    "filename updated",
    updatedImage.filename,
    fullUpdateBody.filename,
  );
  TestValidator.equals(
    "mime_type updated",
    updatedImage.mime_type,
    fullUpdateBody.mime_type,
  );
  TestValidator.equals(
    "image_type updated",
    updatedImage.image_type,
    fullUpdateBody.image_type,
  );
  TestValidator.equals(
    "alt_text updated",
    updatedImage.alt_text,
    fullUpdateBody.alt_text,
  );
  TestValidator.equals(
    "file_size preserved",
    updatedImage.file_size,
    initialImage.file_size,
  );
  TestValidator.equals(
    "width preserved",
    updatedImage.width,
    initialImage.width,
  );
  TestValidator.equals(
    "height preserved",
    updatedImage.height,
    initialImage.height,
  );
  // 5. Test partial update with only filename and alt_text
  const partialUpdateBody = {
    filename: `${RandomGenerator.alphabets(12)}.gif`,
    alt_text: null,
  } satisfies IDiscussionBoardSectionImage.IUpdate;
  const partiallyUpdatedImage =
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdatedImage);
  // Validate partial update
  TestValidator.equals(
    "filename updated in partial update",
    partiallyUpdatedImage.filename,
    partialUpdateBody.filename,
  );
  TestValidator.equals(
    "alt_text set to null",
    partiallyUpdatedImage.alt_text,
    null,
  );
  TestValidator.equals(
    "mime_type preserved",
    partiallyUpdatedImage.mime_type,
    updatedImage.mime_type,
  );
  TestValidator.equals(
    "image_type preserved",
    partiallyUpdatedImage.image_type,
    updatedImage.image_type,
  );
  TestValidator.equals(
    "file_size preserved",
    partiallyUpdatedImage.file_size,
    updatedImage.file_size,
  );
}
