import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagTransformer } from "../transformers/CommunityPlatformFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlag.IUpdate;
}): Promise<ICommunityPlatformFeatureFlag> {
  // Verify the feature flag exists
  const existingFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId },
    });
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined && props.body.name !== existingFlag.name) {
    const existingWithSameName =
      await MyGlobal.prisma.community_platform_feature_flags.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.featureFlagId },
        },
      });
    if (existingWithSameName) {
      throw new HttpException("Feature flag name must be unique", 400);
    }
  }
  // Validate flag_type enum values
  if (
    props.body.flag_type !== undefined &&
    !["boolean", "percentage", "user_specific"].includes(props.body.flag_type)
  ) {
    throw new HttpException(
      "flag_type must be one of: 'boolean', 'percentage', 'user_specific'",
      400,
    );
  }
  // Validate status enum values
  if (
    props.body.status !== undefined &&
    !["active", "inactive", "archived"].includes(props.body.status)
  ) {
    throw new HttpException(
      "status must be one of: 'active', 'inactive', 'archived'",
      400,
    );
  }
  // Validate percentage_value range
  if (
    props.body.percentage_value !== undefined &&
    props.body.percentage_value !== null
  ) {
    if (props.body.percentage_value < 0 || props.body.percentage_value > 100) {
      throw new HttpException(
        "percentage_value must be between 0 and 100",
        400,
      );
    }
  }
  // Prepare update data with conditional field handling
  const updateData: Prisma.community_platform_feature_flagsUpdateInput = {
    updated_at: new Date(),
  };
  // Handle name update
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  // Handle description update
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Handle flag_type update with conditional field nulling
  if (props.body.flag_type !== undefined) {
    updateData.flag_type = props.body.flag_type;
    // Null incompatible values when changing flag_type
    if (props.body.flag_type !== existingFlag.flag_type) {
      if (props.body.flag_type === "boolean") {
        updateData.percentage_value = null;
      } else if (props.body.flag_type === "percentage") {
        updateData.boolean_value = null;
      } else if (props.body.flag_type === "user_specific") {
        updateData.boolean_value = null;
        updateData.percentage_value = null;
      }
    }
  }
  // Handle status update
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  // Handle boolean_value update (only if flag_type is boolean)
  if (props.body.boolean_value !== undefined) {
    const targetFlagType = props.body.flag_type ?? existingFlag.flag_type;
    if (targetFlagType === "boolean") {
      updateData.boolean_value = props.body.boolean_value;
    } else {
      throw new HttpException(
        "boolean_value can only be set for boolean flag types",
        400,
      );
    }
  }
  // Handle percentage_value update (only if flag_type is percentage)
  if (props.body.percentage_value !== undefined) {
    const targetFlagType = props.body.flag_type ?? existingFlag.flag_type;
    if (targetFlagType === "percentage") {
      updateData.percentage_value = props.body.percentage_value;
    } else {
      throw new HttpException(
        "percentage_value can only be set for percentage flag types",
        400,
      );
    }
  }
  // Update the feature flag
  const updatedFlag =
    await MyGlobal.prisma.community_platform_feature_flags.update({
      where: { id: props.featureFlagId },
      data: updateData,
      ...CommunityPlatformFeatureFlagTransformer.select(),
    });
  // Transform and return the result
  return await CommunityPlatformFeatureFlagTransformer.transform(updatedFlag);
}
