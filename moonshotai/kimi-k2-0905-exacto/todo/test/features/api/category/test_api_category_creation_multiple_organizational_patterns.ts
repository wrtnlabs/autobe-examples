import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_creation_multiple_organizational_patterns(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "StrongPassword123!",
      href: "https://todoapp.example.com/join",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Test Project-based organizational pattern
  const projectCategories = [
    {
      name: "Website Redesign",
      description: "Tasks related to the company website redesign project",
    },
    {
      name: "Mobile App Development",
      description: "Mobile application development tasks and features",
    },
    {
      name: "Marketing Campaign Q1",
      description: "Marketing activities and campaigns for first quarter",
    },
  ];

  const createdProjectCategories: ITodoAppCategory[] = [];
  for (const categoryData of projectCategories) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    createdProjectCategories.push(category);

    TestValidator.equals(
      "project category name matches",
      category.name,
      categoryData.name,
    );
    TestValidator.equals(
      "project category description matches",
      category.description,
      categoryData.description,
    );
    TestValidator.equals(
      "category belongs to authenticated user",
      category.user.id,
      user.id,
    );
  }

  // 3. Test Context-based organizational pattern
  const contextCategories = [
    {
      name: "Office Tasks",
      description: "Tasks that need to be done at the office or workplace",
    },
    {
      name: "Home Projects",
      description: "Personal projects and tasks for home environment",
    },
    {
      name: "Errands",
      description: "Tasks requiring travel or outside activities",
    },
    {
      name: "Phone Calls",
      description: "Tasks involving phone conversations or calls",
    },
  ];

  const createdContextCategories: ITodoAppCategory[] = [];
  for (const categoryData of contextCategories) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    createdContextCategories.push(category);
  }

  // 4. Test Priority-based organizational pattern
  const priorityCategories = [
    {
      name: "Urgent - Do Today",
      description: "High priority tasks that must be completed today",
    },
    {
      name: "Important - This Week",
      description: "Important tasks to complete within the current week",
    },
    {
      name: "Nice to Have",
      description:
        "Low priority tasks that would be nice to complete when time permits",
    },
  ];

  const createdPriorityCategories: ITodoAppCategory[] = [];
  for (const categoryData of priorityCategories) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    createdPriorityCategories.push(category);
  }

  // 5. Test Workflow-stage organizational pattern
  const workflowCategories = [
    {
      name: "Ideas & Planning",
      description: "Initial ideas and planning phase tasks",
    },
    {
      name: "In Progress",
      description: "Tasks currently being worked on",
    },
    {
      name: "Review & Feedback",
      description: "Tasks awaiting review or feedback from others",
    },
    {
      name: "Completed",
      description: "Finished tasks for documentation and closure",
    },
  ];

  const createdWorkflowCategories: ITodoAppCategory[] = [];
  for (const categoryData of workflowCategories) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    createdWorkflowCategories.push(category);
  }

  // 6. Test mixed organizational approach
  const mixedCategories = [
    {
      name: "Client Meetings",
      description: "Scheduled meetings with external clients and stakeholders",
    },
    {
      name: "Personal Development",
      description: "Learning, training, and skill development activities",
    },
    {
      name: "Team Collaboration",
      description:
        "Tasks requiring coordination and collaboration with team members",
    },
  ];

  const createdMixedCategories: ITodoAppCategory[] = [];
  for (const categoryData of mixedCategories) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: categoryData satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    createdMixedCategories.push(category);
  }

  // 7. Validate all categories are successfully created
  const allCategories = [
    ...createdProjectCategories,
    ...createdContextCategories,
    ...createdPriorityCategories,
    ...createdWorkflowCategories,
    ...createdMixedCategories,
  ];

  TestValidator.predicate(
    "all categories created successfully",
    allCategories.length === 14,
  );

  // 8. Test category name validation - unique constraint
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Website Redesign", // Already exists from project categories
        description: "Another website redesign attempt",
      } satisfies ITodoAppCategory.ICreate,
    });
  });

  // 9. Test category name length validation
  await TestValidator.error("category name too short should fail", async () => {
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "A", // Too short (minimum 2 characters)
        description: "Short name test",
      } satisfies ITodoAppCategory.ICreate,
    });
  });

  await TestValidator.error("category name too long should fail", async () => {
    const longName = ArrayUtil.repeat(51, () => "a").join(""); // Too long (maximum 50 characters)
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: longName,
        description: "Long name test",
      } satisfies ITodoAppCategory.ICreate,
    });
  });

  // 10. Test special characters in category names
  const specialCharCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Data Analysis & Reports",
        description:
          "Analysis tasks involving data processing and report generation",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(specialCharCategory);

  TestValidator.predicate(
    "special characters handled correctly",
    specialCharCategory.name.includes("&"),
  );

  // 11. Test category without description
  const noDescCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Quick Notes",
        description: undefined, // Optional field
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(noDescCategory);

  TestValidator.equals(
    "category without description creates successfully",
    noDescCategory.description,
    undefined,
  );
}
