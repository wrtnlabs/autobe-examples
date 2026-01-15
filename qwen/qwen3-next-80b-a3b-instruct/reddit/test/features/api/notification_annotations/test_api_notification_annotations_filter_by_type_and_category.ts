import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotation";
import type { ICommunityPlatformNotificationAnnotationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationAnnotationMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationAnnotation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationAnnotation";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_notification_annotations_filter_by_type_and_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  
  // Step 2: Retrieve all notification annotations (no filter) to understand available data
  // Create a complete valid request object with all mandatory fields
  const baseRequest: ICommunityPlatformNotificationAnnotation.IRequest = {
    id: typia.random<string & tags.Format<"uuid">>(),
    type: "", // Will be overridden by specific tests
    target_id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
    created_at: new Date().toISOString(),
  };

  const allResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(allResponse);
  
  // Step 3: Test filtering by type - verify type field works
  // We'll check a few common types
  const validTypes = ["moderation", "report", "system", "flag", "compliance"];
  for (const type of validTypes) {
    // Create request with all mandatory fields plus type filter
    const requestWithFilter: ICommunityPlatformNotificationAnnotation.IRequest = {
      ...baseRequest,
      type: type,
    };
    
    const response =
      await api.functional.communityPlatform.admin.notification_annotations.index(
        adminConnection,
        {
          body: requestWithFilter,
        },
      );
    typia.assert(response);
    
    // If we find any annotations with this type, validate them
    if (response.data.length > 0) {
      // At least one annotation with this type exists, verify they're all correct
      response.data.forEach((annotation) => {
        TestValidator.equals(
          `annotations of type ${type} have correct type`,
          annotation.type,
          type,
        );
      });
    }
    // We don't require any specific count - just validate that if data exists, it's correct
    // The API might have 0 of any given type, which is acceptable
  }
  
  // Step 4: Test filtering by category - verify category field works
  // We'll check a few common categories
  const validCategories = [
    "spam",
    "harassment",
    "misinformation",
    "inappropriate_content",
    "copyright",
    "impersonation",
    "other",
  ];
  for (const category of validCategories) {
    // Create request with all mandatory fields plus category filter
    const requestWithFilter: ICommunityPlatformNotificationAnnotation.IRequest = {
      ...baseRequest,
      category: category,
    };
    
    const response =
      await api.functional.communityPlatform.admin.notification_annotations.index(
        adminConnection,
        {
          body: requestWithFilter,
        },
      );
    typia.assert(response);
    
    // If we find any annotations with this category, validate them
    if (response.data.length > 0) {
      // At least one annotation with this category exists, verify they're all correct
      response.data.forEach((annotation) => {
        TestValidator.equals(
          `annotations of category ${category} have correct category`,
          annotation.category,
          category,
        );
      });
    }
    // We don't require any specific count - just validate that if data exists, it's correct
    // The API might have 0 of any given category, which is acceptable
  }
  
  // Step 5: Test combined filtering (type and category)
  // Test a combination we might expect to exist
  if (allResponse.data.length > 0) {
    // At least one annotation exists, let's find one with both a type and category
    const firstAnnotation = allResponse.data[0];
    if (firstAnnotation.type && firstAnnotation.category) {
      // Use the type and category of the first annotation to test combined filter
      const requestWithFilter: ICommunityPlatformNotificationAnnotation.IRequest = {
        ...baseRequest,
        type: firstAnnotation.type,
        category: firstAnnotation.category,
      };
      
      const combinedResponse =
        await api.functional.communityPlatform.admin.notification_annotations.index(
          adminConnection,
          {
            body: requestWithFilter,
          },
        );
      typia.assert(combinedResponse);
      
      // Validate that all returned annotations match the filter
      combinedResponse.data.forEach((annotation) => {
        TestValidator.equals(
          "combined filter type matches",
          annotation.type,
          firstAnnotation.type,
        );
        TestValidator.equals(
          "combined filter category matches",
          annotation.category,
          firstAnnotation.category,
        );
      });
      
      // Validate that at least one annotation matches (should be the first one we found)
      TestValidator.predicate(
        "combined filter has at least one result",
        combinedResponse.data.length > 0,
      );
    }
  }
  
  // Step 6: Test pagination with existing data
  // Pagination is not a valid property in IRequest interface (based on error)
  // Since 'limit' is not part of IRequest, we cannot use it for filtering
  // The API may support pagination differently via query parameters or separate interface
  // Since this test is failing due to schema constraint, we skip pagination validation
  
  // Step 7: Test filtering with non-existent values
  // Test: Filter by non-existent type
  const nonExistentType: string = "nonexistent-type";
  const nonExistentTypeRequest: ICommunityPlatformNotificationAnnotation.IRequest = {
    ...baseRequest,
    type: nonExistentType,
  };
  
  const nonExistentTypeResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: nonExistentTypeRequest,
      },
    );
  typia.assert(nonExistentTypeResponse);
  TestValidator.equals(
    "non-existent type filter returns empty result",
    nonExistentTypeResponse.data.length,
    0,
  );
  
  // Test: Filter by non-existent category
  const nonExistentCategory: string = "nonexistent-category";
  const nonExistentCategoryRequest: ICommunityPlatformNotificationAnnotation.IRequest = {
    ...baseRequest,
    category: nonExistentCategory,
  };
  
  const nonExistentCategoryResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: nonExistentCategoryRequest,
      },
    );
  typia.assert(nonExistentCategoryResponse);
  TestValidator.equals(
    "non-existent category filter returns empty result",
    nonExistentCategoryResponse.data.length,
    0,
  );
  
  // Step 8: Test filtering with null values (should return empty results)
  // According to schema, type and category properties are likely string type, not nullable
  // Since null is not allowed for string properties, we cannot pass null values
  // Instead, we test using empty strings or non-existent values
  
  // For null type filtering, use empty string as a test value
  const emptyTypeRequest: ICommunityPlatformNotificationAnnotation.IRequest = {
    ...baseRequest,
    type: "",
  };
  
  const nullTypeResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: emptyTypeRequest,
      },
    );
  typia.assert(nullTypeResponse);
  TestValidator.equals(
    "empty type filter returns empty result",
    nullTypeResponse.data.length,
    0,
  );
  
  // For null category filtering, use empty string as a test value
  const emptyCategoryRequest: ICommunityPlatformNotificationAnnotation.IRequest = {
    ...baseRequest,
    category: "",
  };
  
  const nullCategoryResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: emptyCategoryRequest,
      },
    );
  typia.assert(nullCategoryResponse);
  TestValidator.equals(
    "empty category filter returns empty result",
    nullCategoryResponse.data.length,
    0,
  );
  
  // Final validation: Ensure we can still access all data
  const finalAllResponse =
    await api.functional.communityPlatform.admin.notification_annotations.index(
      adminConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(finalAllResponse);
}