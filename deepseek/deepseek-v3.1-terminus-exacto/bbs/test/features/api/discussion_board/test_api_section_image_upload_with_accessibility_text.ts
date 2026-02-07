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

export async function test_api_section_image_upload_with_accessibility_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: "Test Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a section to upload images to
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Accessibility Test Section",
        description:
          "Section for testing image upload with accessibility features",
        display_order: 1,
      },
    },
  );
  typia.assert(section);
  // 3. Upload image with alt text provided
  const imageWithAltText =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "accessible-image.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          image_type: "banner",
          storage_path: "/images/accessible-image.jpg",
          alt_text:
            "A descriptive text explaining the image content for screen readers",
        },
      },
    );
  typia.assert(imageWithAltText);
  // 4. Validate alt text is properly stored and returned
  TestValidator.equals(
    "alt text should be stored when provided",
    imageWithAltText.alt_text,
    "A descriptive text explaining the image content for screen readers",
  );
  // 5. Upload image with null alt text
  const imageWithNullAltText =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "image-with-null-alt.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          image_type: "icon",
          storage_path: "/images/image-with-null-alt.jpg",
          alt_text: null,
        },
      },
    );
  typia.assert(imageWithNullAltText);
  // 6. Validate null alt text is properly handled
  TestValidator.equals(
    "null alt text should be accepted",
    imageWithNullAltText.alt_text,
    null,
  );
  // 7. Validate section association
  TestValidator.equals(
    "image should be associated with correct section",
    imageWithAltText.section.id,
    section.id,
  );
  TestValidator.equals(
    "image with null alt should be associated with correct section",
    imageWithNullAltText.section.id,
    section.id,
  );
  // 8. Validate image metadata integrity
  TestValidator.predicate(
    "image with alt text should have valid file size",
    imageWithAltText.file_size > 0,
  );
  TestValidator.predicate(
    "image with null alt should have valid file size",
    imageWithNullAltText.file_size > 0,
  );
  TestValidator.predicate(
    "image with alt text should have valid dimensions",
    imageWithAltText.width > 0 && imageWithAltText.height > 0,
  );
  TestValidator.predicate(
    "image with null alt should have valid dimensions",
    imageWithNullAltText.width > 0 && imageWithNullAltText.height > 0,
  );
  // 9. Validate image types are correct enum values
  TestValidator.equals(
    "image with alt text should have valid image type",
    imageWithAltText.image_type,
    "banner",
  );
  TestValidator.equals(
    "image with null alt should have valid image type",
    imageWithNullAltText.image_type,
    "icon",
  );
  // 10. Validate distinct entity creation
  TestValidator.notEquals(
    "images should have distinct IDs",
    imageWithAltText.id,
    imageWithNullAltText.id,
  );
}
