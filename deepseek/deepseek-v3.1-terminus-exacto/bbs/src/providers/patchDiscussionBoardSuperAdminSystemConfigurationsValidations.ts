import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemConfigurationsValidations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IDiscussionBoardSystemConfiguration.IResponse> {
  const results: IDiscussionBoardSystemConfiguration.IResult[] = [];
  let errorCount = 0;
  for (const config of props.body.configurations) {
    const validationResult: IDiscussionBoardSystemConfiguration.IResult = {
      config_key: config.config_key,
      config_value: config.config_value,
      validation_status: "valid",
      error_messages: [],
      data_type: "", // Will be set from database
    };
    try {
      // Check if configuration key exists in database
      const existingConfig =
        await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
          where: {
            config_key: config.config_key,
            deleted_at: null,
          },
        });
      if (!existingConfig) {
        validationResult.validation_status = "invalid";
        validationResult.error_messages.push(
          `Configuration key '${config.config_key}' does not exist in the system`,
        );
        validationResult.data_type = config.data_type;
        errorCount++;
        results.push(validationResult);
        continue;
      }
      // Use the data_type from the database record
      validationResult.data_type = existingConfig.data_type;
      // Validate data type compatibility using database-stored data_type
      const typeValidation = validateDataType(
        config.config_value,
        existingConfig.data_type,
      );
      if (!typeValidation.isValid) {
        validationResult.validation_status = "invalid";
        validationResult.error_messages.push(typeValidation.errorMessage);
        errorCount++;
      }
      // Apply additional business rule validations based on configuration key
      const businessValidation = validateBusinessRules(
        config.config_key,
        config.config_value,
        existingConfig.data_type,
      );
      if (!businessValidation.isValid) {
        validationResult.validation_status = "invalid";
        validationResult.error_messages.push(
          ...businessValidation.errorMessages,
        );
        errorCount += businessValidation.errorMessages.length;
      }
      results.push(validationResult);
    } catch (error) {
      // Handle database or validation errors
      validationResult.validation_status = "invalid";
      validationResult.error_messages.push(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      validationResult.data_type = config.data_type;
      errorCount++;
      results.push(validationResult);
    }
  }
  // Determine overall validation status
  const validationStatus: "success" | "partial_success" | "failed" =
    errorCount === 0
      ? "success"
      : errorCount < props.body.configurations.length
        ? "partial_success"
        : "failed";
  return {
    validation_status: validationStatus,
    results: results,
    error_count: errorCount,
    warning_count: 0, // No warnings implemented in current version
  };
}
// Helper function to validate data type compatibility
function validateDataType(
  value: string,
  expectedType: string,
): {
  isValid: boolean;
  errorMessage: string;
} {
  try {
    const normalizedType = expectedType.toLowerCase().trim();
    switch (normalizedType) {
      case "string":
        // All values are strings by default, so this always passes
        return { isValid: true, errorMessage: "" };
      case "integer":
      case "int":
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || intValue.toString() !== value.trim()) {
          return {
            isValid: false,
            errorMessage: `Value '${value}' is not a valid integer`,
          };
        }
        return { isValid: true, errorMessage: "" };
      case "boolean":
      case "bool":
        const lowerValue = value.toLowerCase().trim();
        if (
          lowerValue !== "true" &&
          lowerValue !== "false" &&
          lowerValue !== "1" &&
          lowerValue !== "0" &&
          lowerValue !== "yes" &&
          lowerValue !== "no"
        ) {
          return {
            isValid: false,
            errorMessage: `Value '${value}' is not a valid boolean (expected 'true', 'false', '1', '0', 'yes', or 'no')`,
          };
        }
        return { isValid: true, errorMessage: "" };
      case "json":
        try {
          JSON.parse(value);
          return { isValid: true, errorMessage: "" };
        } catch (parseError) {
          return {
            isValid: false,
            errorMessage: `Value '${value}' is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          };
        }
      case "number":
      case "float":
      case "double":
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            isValid: false,
            errorMessage: `Value '${value}' is not a valid number`,
          };
        }
        return { isValid: true, errorMessage: "" };
      default:
        return {
          isValid: false,
          errorMessage: `Unsupported data type '${expectedType}'`,
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Data type validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
// Helper function to validate business rules
function validateBusinessRules(
  configKey: string,
  value: string,
  dataType: string,
): {
  isValid: boolean;
  errorMessages: string[];
} {
  const errorMessages: string[] = [];
  try {
    // Add business rule validations based on specific configuration keys
    switch (configKey) {
      case "rate_limit_requests_per_minute":
        if (dataType === "integer" || dataType === "int") {
          const intValue = parseInt(value, 10);
          if (isNaN(intValue) || intValue < 1 || intValue > 10000) {
            errorMessages.push(
              "Rate limit must be between 1 and 10000 requests per minute",
            );
          }
        }
        break;
      case "session_timeout_minutes":
        if (dataType === "integer" || dataType === "int") {
          const intValue = parseInt(value, 10);
          if (isNaN(intValue) || intValue < 15 || intValue > 1440) {
            errorMessages.push(
              "Session timeout must be between 15 and 1440 minutes (24 hours)",
            );
          }
        }
        break;
      case "max_upload_size_mb":
        if (dataType === "integer" || dataType === "int") {
          const intValue = parseInt(value, 10);
          if (isNaN(intValue) || intValue < 1 || intValue > 100) {
            errorMessages.push(
              "Maximum upload size must be between 1 and 100 MB",
            );
          }
        }
        break;
      case "min_password_length":
        if (dataType === "integer" || dataType === "int") {
          const intValue = parseInt(value, 10);
          if (isNaN(intValue) || intValue < 4 || intValue > 64) {
            errorMessages.push(
              "Minimum password length must be between 4 and 64 characters",
            );
          }
        }
        break;
      case "max_login_attempts":
        if (dataType === "integer" || dataType === "int") {
          const intValue = parseInt(value, 10);
          if (isNaN(intValue) || intValue < 1 || intValue > 10) {
            errorMessages.push(
              "Maximum login attempts must be between 1 and 10",
            );
          }
        }
        break;
      // Add more configuration-specific validations as needed
      default:
        // No specific business rules for this configuration key
        break;
    }
  } catch (error) {
    errorMessages.push(
      `Business rule validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    isValid: errorMessages.length === 0,
    errorMessages,
  };
}
