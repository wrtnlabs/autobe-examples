import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a section using generation utility function
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 1,
            wordMax: 2,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 2,
          }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create an initial image attachment using generation utility function
  const createImageBody = {
    filename: `${RandomGenerator.alphabets(8)}.jpg`,
    mime_type: "image/jpeg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1920>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1080>
    >(),
    image_type: "banner" as const,
    storage_path: `/sections/${section.id}/images/${RandomGenerator.alphabets(12)}.jpg`,
    alt_text: "Initial accessibility description",
  } satisfies IDiscussionBoardSectionImage.ICreate;
  const originalImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        body: createImageBody,
        params: { sectionId: section.id },
      },
    );
  typia.assert(originalImage);
  // 4. Test partial update: only update alt text (accessibility improvement)
  const updatedAltText = "Updated accessibility description for screen readers";
  const partialUpdate =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: originalImage.id,
        body: {
          alt_text: updatedAltText,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  // 5. Validate that only alt_text was updated and immutable fields remain unchanged
  TestValidator.equals(
    "alt text updated",
    partialUpdate.alt_text,
    updatedAltText,
  );
  TestValidator.equals(
    "filename unchanged",
    partialUpdate.filename,
    originalImage.filename,
  );
  TestValidator.equals(
    "mime_type unchanged",
    partialUpdate.mime_type,
    originalImage.mime_type,
  );
  TestValidator.equals(
    "file_size unchanged",
    partialUpdate.file_size,
    originalImage.file_size,
  );
  TestValidator.equals(
    "width unchanged",
    partialUpdate.width,
    originalImage.width,
  );
  TestValidator.equals(
    "height unchanged",
    partialUpdate.height,
    originalImage.height,
  );
  TestValidator.equals(
    "image_type unchanged",
    partialUpdate.image_type,
    originalImage.image_type,
  );
  TestValidator.equals(
    "storage_path unchanged",
    partialUpdate.storage_path,
    originalImage.storage_path,
  );
  // 6. Test nullable alt text removal (update to null)
  const nullAltUpdate =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: originalImage.id,
        body: {
          alt_text: null,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(nullAltUpdate);
  TestValidator.equals("alt text removed (null)", nullAltUpdate.alt_text, null);
  TestValidator.equals(
    "other fields remain unchanged after null update",
    nullAltUpdate.filename,
    originalImage.filename,
  );
  TestValidator.equals(
    "mime_type still unchanged",
    nullAltUpdate.mime_type,
    originalImage.mime_type,
  );
  // 7. Test partial update with multiple fields (filename and image_type)
  const newFilename = `${RandomGenerator.alphabets(8)}_updated.png`;
  const newImageType = "promotional" as const;
  const multiFieldUpdate =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: originalImage.id,
        body: {
          filename: newFilename,
          image_type: newImageType,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(multiFieldUpdate);
  TestValidator.equals(
    "filename updated",
    multiFieldUpdate.filename,
    newFilename,
  );
  TestValidator.equals(
    "image_type updated",
    multiFieldUpdate.image_type,
    newImageType,
  );
  TestValidator.equals(
    "alt text remains null",
    multiFieldUpdate.alt_text,
    null,
  );
  TestValidator.equals(
    "immutable file_size still unchanged",
    multiFieldUpdate.file_size,
    originalImage.file_size,
  );
}
