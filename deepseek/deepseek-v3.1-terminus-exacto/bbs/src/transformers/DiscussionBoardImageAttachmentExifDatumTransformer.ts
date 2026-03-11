import { IDiscussionBoardImageAttachmentExifDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachmentExifDatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardImageAttachmentExifDatumTransformer {
  export type Payload =
    Prisma.discussion_board_image_attachment_exif_dataGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        camera_make: true,
        camera_model: true,
        lens_model: true,
        exposure_time: true,
        f_number: true,
        iso_speed: true,
        focal_length: true,
        flash_fired: true,
        metering_mode: true,
        white_balance: true,
        orientation: true,
        gps_latitude: true,
        gps_longitude: true,
        gps_altitude: true,
        capture_date: true,
        software: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        imageAttachment: {
          select: { id: true },
        } satisfies Prisma.discussion_board_image_attachmentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_image_attachment_exif_dataFindManyArgs;
  }
  export function transform(
    input: Payload,
  ): IDiscussionBoardImageAttachmentExifDatum {
    return {
      camera_make: input.camera_make ?? undefined,
      camera_model: input.camera_model ?? undefined,
      lens_model: input.lens_model ?? undefined,
      exposure_time: input.exposure_time ?? undefined,
      f_number: input.f_number ?? undefined,
      iso_speed: input.iso_speed ?? undefined,
      focal_length: input.focal_length ?? undefined,
      flash_fired: input.flash_fired ?? undefined,
      metering_mode: input.metering_mode ?? undefined,
      white_balance: input.white_balance ?? undefined,
      orientation: input.orientation ?? undefined,
      gps_latitude: input.gps_latitude ?? undefined,
      gps_longitude: input.gps_longitude ?? undefined,
      gps_altitude: input.gps_altitude ?? undefined,
      capture_date: input.capture_date?.toISOString() ?? undefined,
      software: input.software ?? undefined,
    };
  }
}
