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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemConfigurationsValidations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IDiscussionBoardSystemConfiguration.IResponse> {
  try {
    // Get all existing non-deleted system configurations
    const existingConfigs =
      await MyGlobal.prisma.discussion_board_system_configurations.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          config_key: true,
          data_type: true,
          description: true,
          is_sensitive: true,
        },
      });
    // Create lookup map for efficient validation
    const configMap = new Map(
      existingConfigs.map((config) => [config.config_key, config]),
    );
    const validationResults = await Promise.all(
      props.body.configurations.map((config) =>
        validateConfigurationParameter(config, configMap),
      ),
    );
    const errorCount = validationResults.filter(
      (result) => result.validation_status === "invalid",
    ).length;
    const warningCount =
      validationResults.filter((result) => result.error_messages.length > 0)
        .length - errorCount;
    const overallStatus = determineOverallStatus(
      errorCount,
      validationResults.length,
    );
    return {
      validation_status: overallStatus,
      results: validationResults,
      error_count: Math.max(0, errorCount) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      warning_count: Math.max(0, warningCount) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    };
  } catch (error) {
    throw new HttpException(
      "Configuration validation failed: " +
        (error instanceof Error ? error.message : "Unknown error"),
      500,
    );
  }
}
function determineOverallStatus(
  errorCount: number,
  totalCount: number,
): IDiscussionBoardSystemConfiguration.IResponse["validation_status"] {
  if (errorCount === 0) return "success";
  if (errorCount === totalCount) return "failed";
  return "partial_success";
}
async function validateConfigurationParameter(
  config: IDiscussionBoardSystemConfigurationValidationItem,
  configMap: Map<
    string,
    {
      config_key: string;
      data_type: string;
      description: string;
      is_sensitive: boolean;
    }
  >,
): Promise<IDiscussionBoardSystemConfiguration.IResult> {
  const errorMessages: string[] = [];
  const existingConfig = configMap.get(config.config_key);
  if (!existingConfig) {
    errorMessages.push(
      `Configuration key '${config.config_key}' does not exist in the system`,
    );
    return createValidationResult(
      config,
      "invalid",
      errorMessages,
      config.data_type,
    );
  }
  // Mask sensitive values in error messages
  const displayValue = existingConfig.is_sensitive
    ? "[REDACTED]"
    : config.config_value;
  // Validate data type consistency
  if (config.data_type !== existingConfig.data_type) {
    errorMessages.push(
      `Expected data type '${existingConfig.data_type}' but got '${config.data_type}'`,
    );
  }
  // Validate value format
  const formatValidation = validateValueFormat(
    config.config_value,
    existingConfig.data_type,
  );
  if (!formatValidation.valid) {
    errorMessages.push(`Value '${displayValue}': ${formatValidation.error}`);
  }
  // Validate business rules
  const businessValidation = validateBusinessRules(
    config.config_key,
    config.config_value,
    existingConfig.data_type,
  );
  errorMessages.push(
    ...businessValidation.errors.map((err) => `Business rule: ${err}`),
  );
  const status = errorMessages.length === 0 ? "valid" : "invalid";
  return createValidationResult(
    config,
    status,
    errorMessages,
    existingConfig.data_type,
  );
}
function createValidationResult(
  config: IDiscussionBoardSystemConfigurationValidationItem,
  status: "valid" | "invalid",
  errorMessages: string[],
  actualDataType: string,
): IDiscussionBoardSystemConfiguration.IResult {
  return {
    config_key: config.config_key,
    config_value: config.config_value,
    validation_status: status,
    error_messages: errorMessages,
    data_type: actualDataType,
  };
}
function validateValueFormat(
  value: string,
  dataType: string,
): {
  valid: boolean;
  error?: string;
} {
  try {
    switch (dataType) {
      case "string":
        return { valid: true };
      case "integer":
        const intValue = Number(value);
        if (!Number.isInteger(intValue) || isNaN(intValue)) {
          return { valid: false, error: "Must be a valid integer" };
        }
        return { valid: true };
      case "boolean":
        const normalizedValue = value.toLowerCase().trim();
        if (
          !["true", "false", "1", "0", "yes", "no"].includes(normalizedValue)
        ) {
          return { valid: false, error: "Must be a boolean value" };
        }
        return { valid: true };
      case "json":
        try {
          JSON.parse(value);
          return { valid: true };
        } catch {
          return { valid: false, error: "Must be valid JSON format" };
        }
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: "Must be a valid email address" };
        }
        return { valid: true };
      case "url":
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, error: "Must be a valid URL" };
        }
      default:
        return { valid: true };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
function validateBusinessRules(
  configKey: string,
  value: string,
  dataType: string,
): {
  errors: string[];
} {
  const errors: string[] = [];
  if (dataType === "integer" || dataType === "number") {
    const numericValue = Number(value);
    switch (configKey) {
      case "max_file_size":
        if (numericValue < 1024) errors.push("Minimum file size is 1KB");
        if (numericValue > 104857600) errors.push("Maximum file size is 100MB");
        break;
      case "rate_limit_requests":
        if (numericValue < 1) errors.push("Minimum rate limit is 1 request");
        if (numericValue > 10000)
          errors.push("Maximum rate limit is 10,000 requests");
        break;
      case "session_timeout":
        if (numericValue < 300)
          errors.push("Minimum session timeout is 300 seconds (5 minutes)");
        if (numericValue > 604800)
          errors.push("Maximum session timeout is 604800 seconds (7 days)");
        break;
      case "max_login_attempts":
        if (numericValue < 1) errors.push("Minimum login attempts is 1");
        if (numericValue > 20) errors.push("Maximum login attempts is 20");
        break;
      case "password_min_length":
        if (numericValue < 6)
          errors.push("Minimum password length is 6 characters");
        if (numericValue > 128)
          errors.push("Maximum password length is 128 characters");
        break;
    }
  }
  if (dataType === "string") {
    switch (configKey) {
      case "default_timezone":
        try {
          Intl.DateTimeFormat(undefined, { timeZone: value });
        } catch {
          errors.push("Must be a valid IANA timezone identifier");
        }
        break;
      case "supported_locales":
        const locales = value.split(",").map((locale) => locale.trim());
        for (const locale of locales) {
          try {
            new Intl.Locale(locale);
          } catch {
            errors.push(`Invalid locale format: ${locale}`);
          }
        }
        break;
    }
  }
  return { errors };
}
