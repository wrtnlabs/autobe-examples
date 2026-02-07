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

export async function test_api_section_image_accessibility_text_update(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create initial section image with null alt_text
  const initialImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "test-image.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          image_type: "banner" as const,
          storage_path: "/images/test-image.jpg",
          alt_text: null,
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // Update image metadata to add descriptive alt_text
  const updateWithAltText =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: {
          alt_text: "A descriptive text for screen reader accessibility",
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(updateWithAltText);
  // Update image metadata to remove alt_text (set back to null)
  const updateWithoutAltText =
    await api.functional.discussionBoard.superAdmin.sections.images.update(
      superAdminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: {
          alt_text: null,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(updateWithoutAltText);
  // Test valid image type updates
  const validImageTypes = [
    "banner",
    "icon",
    "promotional",
    "thumbnail",
  ] as const;
  for (const imageType of validImageTypes) {
    const updatedImage =
      await api.functional.discussionBoard.superAdmin.sections.images.update(
        superAdminConnection,
        {
          sectionId: section.id,
          imageId: initialImage.id,
          body: {
            image_type: imageType,
          } satisfies IDiscussionBoardSectionImage.IUpdate,
        },
      );
    typia.assert(updatedImage);
    TestValidator.equals(
      `image type should be updated to ${imageType}`,
      updatedImage.image_type,
      imageType,
    );
  }
  // Validate business logic: alt_text updates should not affect file properties
  TestValidator.predicate(
    "filename should remain consistent throughout updates",
    updateWithoutAltText.filename === initialImage.filename,
  );
  TestValidator.predicate(
    "file_size should remain consistent throughout updates",
    updateWithoutAltText.file_size === initialImage.file_size,
  );
  TestValidator.predicate(
    "width should remain consistent throughout updates",
    updateWithoutAltText.width === initialImage.width,
  );
  TestValidator.predicate(
    "height should remain consistent throughout updates",
    updateWithoutAltText.height === initialImage.height,
  );
  TestValidator.predicate(
    "storage_path should remain consistent throughout updates",
    updateWithoutAltText.storage_path === initialImage.storage_path,
  );
}
